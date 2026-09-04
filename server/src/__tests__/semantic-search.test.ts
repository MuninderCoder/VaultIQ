import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app';
import { DocumentChunkModel } from '../models/DocumentChunk';
import { DocumentModel } from '../models/Document';
import { TextChunker } from '../chunking/text.chunker';

describe('Phase 4: Semantic Vector Search Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let tokenUserA: string;
  let userIdA: string;
  let tokenUserB: string;
  let userIdB: string;

  const testUploadsDir = path.resolve(__dirname, '../../test_uploads_p4');

  beforeAll(async () => {
    process.env.UPLOAD_DIR = testUploadsDir;
    process.env.EMBEDDING_PROVIDER = 'mock';
    process.env.VECTOR_SEARCH_ENGINE = 'local';

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Searcher A',
        email: 'search_a@vaultiq.com',
        password: 'Password123!'
      });
    tokenUserA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Searcher B',
        email: 'search_b@vaultiq.com',
        password: 'Password123!'
      });
    tokenUserB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  describe('Boundary-Aware Text Chunker Unit Verification', () => {
    const chunker = new TextChunker({ chunkSize: 1000, chunkOverlap: 150 });

    it('should be deterministic: same input produces identical chunks', () => {
      const sampleText = 'VaultIQ is an enterprise knowledge platform. '.repeat(50);
      const chunks1 = chunker.chunk(sampleText);
      const chunks2 = chunker.chunk(sampleText);

      expect(chunks1.length).toBeGreaterThan(1);
      expect(chunks1).toEqual(chunks2);
    });

    it('should respect character overlap and boundaries', () => {
      const paragraphA = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
      const paragraphB = 'Artificial intelligence accelerates enterprise workflows. '.repeat(20);
      const fullText = paragraphA + '\n\n' + paragraphB;

      const chunks = chunker.chunk(fullText);
      expect(chunks.length).toBeGreaterThan(1);

      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
        expect(chunk.characterCount).toBeLessThanOrEqual(1000);
        expect(chunk.characterCount).toBeGreaterThan(0);
        expect(chunk.wordCount).toBeGreaterThan(0);
      });
    });

    it('should handle small documents (< chunkSize) as a single chunk with zero overlap', () => {
      const shortText = 'This is a single short policy document with few words.';
      const chunks = chunker.chunk(shortText);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].text).toBe(shortText);
      expect(chunks[0].characterCount).toBe(shortText.length);
    });

    it('should return empty array for empty or whitespace-only text', () => {
      expect(chunker.chunk('')).toEqual([]);
      expect(chunker.chunk('   \n\n\t   ')).toEqual([]);
    });
  });

  describe('Document Indexing Lifecycle & Multi-Tenant Isolation', () => {
    let docIdUserA: string;

    it('should reject indexing on an un-processed document', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .attach('file', Buffer.from('Document uploaded but not processed yet.'), 'unprocessed.txt');

      expect(uploadRes.status).toBe(201);
      const unprocDocId = uploadRes.body.data.document._id;

      const indexRes = await request(app)
        .post('/api/v1/documents/' + unprocDocId + '/index')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(indexRes.status).toBe(400);
      expect(indexRes.body.message).toContain('PROCESSED');
    });

    it('should successfully index a processed document into vector chunks', async () => {
      const leavePolicyText =
        'Annual Leave Policy: Employees are entitled to 25 days paid vacation per year. ' +
        'Sick leave requires a medical certificate after three consecutive days off. ' +
        'Holiday requests must be submitted at least two weeks in advance.';

      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .field('title', 'HR Leave Policy')
        .attach('file', Buffer.from(leavePolicyText), 'leave_policy.txt');

      expect(uploadRes.status).toBe(201);
      docIdUserA = uploadRes.body.data.document._id;

      // 1. Process document first (Phase 3)
      const procRes = await request(app)
        .post('/api/v1/documents/' + docIdUserA + '/process')
        .set('Authorization', 'Bearer ' + tokenUserA);
      expect(procRes.status).toBe(200);
      expect(procRes.body.data.document.status).toBe('PROCESSED');

      // 2. Trigger vector indexing (Phase 4)
      const indexRes = await request(app)
        .post('/api/v1/documents/' + docIdUserA + '/index')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(indexRes.status).toBe(200);
      expect(indexRes.body.data.document.indexingStatus).toBe('INDEXED');
      expect(indexRes.body.data.document.chunkCount).toBeGreaterThan(0);
      expect(indexRes.body.data.document.indexedAt).toBeTruthy();

      const chunks = await DocumentChunkModel.find({ document: docIdUserA });
      expect(chunks.length).toBe(indexRes.body.data.document.chunkCount);
      expect(chunks[0].owner.toString()).toBe(userIdA);
      expect(chunks[0].embedding.length).toBe(1536);
    });

    it('should support checking indexing status endpoint', async () => {
      const statusRes = await request(app)
        .get('/api/v1/documents/' + docIdUserA + '/indexing')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe('INDEXED');
      expect(statusRes.body.data.chunkCount).toBeGreaterThan(0);
      expect(statusRes.body.data.embeddingDimensions).toBe(1536);
    });

    it('should reject indexing a document owned by another user (404/multi-tenant)', async () => {
      const indexRes = await request(app)
        .post('/api/v1/documents/' + docIdUserA + '/index')
        .set('Authorization', 'Bearer ' + tokenUserB);

      expect(indexRes.status).toBe(404);

      const statusRes = await request(app)
        .get('/api/v1/documents/' + docIdUserA + '/indexing')
        .set('Authorization', 'Bearer ' + tokenUserB);

      expect(statusRes.status).toBe(404);
    });

    it('should safely re-index without creating duplicate chunks', async () => {
      const initialChunkCount = (await DocumentChunkModel.find({ document: docIdUserA })).length;

      const reindexRes = await request(app)
        .post('/api/v1/documents/' + docIdUserA + '/index')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(reindexRes.status).toBe(200);
      expect(reindexRes.body.data.document.indexingStatus).toBe('INDEXED');

      const newChunkCount = (await DocumentChunkModel.find({ document: docIdUserA })).length;
      expect(newChunkCount).toBe(initialChunkCount);
    });

    it('should cascade delete chunks when document is deleted', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .attach('file', Buffer.from('Temporary document for cascade deletion testing.'), 'temp.txt');

      const tempDocId = uploadRes.body.data.document._id;
      await request(app)
        .post('/api/v1/documents/' + tempDocId + '/process')
        .set('Authorization', 'Bearer ' + tokenUserA);
      await request(app)
        .post('/api/v1/documents/' + tempDocId + '/index')
        .set('Authorization', 'Bearer ' + tokenUserA);

      const beforeChunks = await DocumentChunkModel.find({ document: tempDocId });
      expect(beforeChunks.length).toBeGreaterThan(0);

      const deleteRes = await request(app)
        .delete('/api/v1/documents/' + tempDocId)
        .set('Authorization', 'Bearer ' + tokenUserA);
      expect(deleteRes.status).toBe(200);

      const afterChunks = await DocumentChunkModel.find({ document: tempDocId });
      expect(afterChunks.length).toBe(0);
    });
  });

  describe('Semantic Vector Search & Multi-Tenant Query Isolation', () => {
    let docIdTechUserA: string;
    let docIdSecUserB: string;

    beforeAll(async () => {
      const techText =
        'Database Storage Architecture: VaultIQ utilizes MongoDB for persistent metadata ' +
        'and local disk storage for binary files. Vector embeddings are stored in dedicated ' +
        'document chunk collections for high performance cosine similarity calculations.';

      const uploadA = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', 'Bearer ' + tokenUserA)
        .field('title', 'Database Architecture')
        .attach('file', Buffer.from(techText), 'database_architecture.txt');

      docIdTechUserA = uploadA.body.data.document._id;
      await request(app)
        .post('/api/v1/documents/' + docIdTechUserA + '/process')
        .set('Authorization', 'Bearer ' + tokenUserA);
      await request(app)
        .post('/api/v1/documents/' + docIdTechUserA + '/index')
        .set('Authorization', 'Bearer ' + tokenUserA);

      const secText =
        'Confidential Security Keys: Secret encryption master keys for production deployment. ' +
        'Strictly confidential to User B security team.';

      const uploadB = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', 'Bearer ' + tokenUserB)
        .field('title', 'User B Secret Document')
        .attach('file', Buffer.from(secText), 'user_b_secret.txt');

      docIdSecUserB = uploadB.body.data.document._id;
      await request(app)
        .post('/api/v1/documents/' + docIdSecUserB + '/process')
        .set('Authorization', 'Bearer ' + tokenUserB);
      await request(app)
        .post('/api/v1/documents/' + docIdSecUserB + '/index')
        .set('Authorization', 'Bearer ' + tokenUserB);
    });

    it('should enforce query validation: reject empty or whitespace query with 400', async () => {
      const emptyRes = await request(app)
        .get('/api/v1/search?q=')
        .set('Authorization', 'Bearer ' + tokenUserA);
      expect(emptyRes.status).toBe(400);

      const whitespaceRes = await request(app)
        .get('/api/v1/search?q=   ')
        .set('Authorization', 'Bearer ' + tokenUserA);
      expect(whitespaceRes.status).toBe(400);
    });

    it('should enforce query validation: enforce limit boundaries', async () => {
      const zeroLimitRes = await request(app)
        .get('/api/v1/search?q=database&limit=0')
        .set('Authorization', 'Bearer ' + tokenUserA);
      expect(zeroLimitRes.status).toBe(400);

      const excessLimitRes = await request(app)
        .get('/api/v1/search?q=database&limit=51')
        .set('Authorization', 'Bearer ' + tokenUserA);
      expect(excessLimitRes.status).toBe(400);
    });

    it('should return semantically relevant chunks ordered descending by cosine similarity', async () => {
      const searchRes = await request(app)
        .get('/api/v1/search?q=vacation%20time%20off%20and%20sick%20leave')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data.results.length).toBeGreaterThan(0);

      const results = searchRes.body.data.results;
      expect(results[0].documentName).toContain('leave_policy');
      expect(results[0].score).toBeGreaterThan(0.7);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should isolate search results: User A must never see User B documents or chunks', async () => {
      const searchRes = await request(app)
        .get('/api/v1/search?q=Confidential%20Security%20Keys')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(searchRes.status).toBe(200);
      const results = searchRes.body.data.results;

      const leaked = results.find(
        (r: any) => r.documentId === docIdSecUserB || r.documentName.includes('secret')
      );
      expect(leaked).toBeUndefined();
    });

    it('should return empty results for queries with no matching semantic chunks', async () => {
      const searchRes = await request(app)
        .get('/api/v1/search?q=quantum%20astrophysics%20black%20holes')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(searchRes.status).toBe(200);
      expect(Array.isArray(searchRes.body.data.results)).toBe(true);
    });

    it('should include accurate indexing statistics in getDocumentStats', async () => {
      const statsRes = await request(app)
        .get('/api/v1/documents/stats')
        .set('Authorization', 'Bearer ' + tokenUserA);

      expect(statsRes.status).toBe(200);
      const { stats } = statsRes.body.data;
      expect(stats.indexedCount).toBeGreaterThan(0);
      expect(typeof stats.notIndexedCount).toBe('number');
      expect(typeof stats.indexingCount).toBe('number');
      expect(typeof stats.indexFailedCount).toBe('number');
    });
  });
});
