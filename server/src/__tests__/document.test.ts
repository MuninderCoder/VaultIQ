import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app';
import { User } from '../models/User';
import { DocumentModel } from '../models/Document';
import { localStorageService } from '../storage/local.storage';

describe('Document Management & Storage API Suite', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let tokenUserA: string;
  let userIdA: string;

  let tokenUserB: string;
  let userIdB: string;

  // Temporary test uploads directory
  const testUploadsDir = path.resolve(__dirname, '../../test_uploads');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User A',
        email: 'usera@vaultiq.com',
        password: 'Password123!'
      });
    tokenUserA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User B',
        email: 'userb@vaultiq.com',
        password: 'Password123!'
      });
    tokenUserB = resB.body.data.token;
    userIdB = resB.body.data.user.id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    // Clean up test uploads directory if created
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    // Clean up MongoDB document entries
    const docs = await DocumentModel.find();
    for (const doc of docs) {
      await localStorageService.delete(doc.storagePath).catch(() => {});
    }
    await DocumentModel.deleteMany({});
  });

  // Helper buffers with valid magic bytes
  const validPdfBuffer = Buffer.from('%PDF-1.4\nTest PDF content binary data');
  // DOCX PK\x03\x04
  const validDocxBuffer = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('Test docx content inside zip stream')
  ]);
  const validTxtBuffer = Buffer.from('Plain text knowledge asset content');
  const validMdBuffer = Buffer.from('# Enterprise Knowledge Policy\nMarkdown document text');

  describe('Document Upload (POST /api/v1/documents)', () => {
    it('should upload a valid PDF document with metadata and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validPdfBuffer, 'company_policy.pdf')
        .field('title', 'Corporate Policy')
        .field('description', 'Official internal policy document')
        .field('tags', JSON.stringify(['compliance', 'legal']));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document).toBeDefined();

      const doc = res.body.data.document;
      expect(doc.originalName).toBe('company_policy.pdf');
      expect(doc.extension).toBe('pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.status).toBe('UPLOADED');
      expect(doc.metadata.title).toBe('Corporate Policy');
      expect(doc.metadata.tags).toContain('compliance');

      // Verify physical file was written to storage
      const existsOnDisk = await localStorageService.exists(doc.storagePath);
      expect(existsOnDisk).toBe(true);
    });

    it('should upload valid DOCX, TXT, and MD files successfully', async () => {
      // DOCX
      const docxRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validDocxBuffer, 'report.docx');
      expect(docxRes.status).toBe(201);
      expect(docxRes.body.data.document.extension).toBe('docx');

      // TXT
      const txtRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validTxtBuffer, 'notes.txt');
      expect(txtRes.status).toBe(201);
      expect(txtRes.body.data.document.extension).toBe('txt');

      // MD
      const mdRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validMdBuffer, 'readme.md');
      expect(mdRes.status).toBe(201);
      expect(mdRes.body.data.document.extension).toBe('md');
    });

    it('should reject unsupported file extension (e.g. .exe)', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', Buffer.from('Binary executable data'), 'malicious.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unsupported file type');
    });

    it('should reject file signature spoofing (PDF named file with fake bytes)', async () => {
      const fakePdf = Buffer.from('NOT A PDF FILE AT ALL');
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', fakePdf, 'spoofed.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('File signature validation failed');
    });

    it('should reject empty (0-byte) file', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', Buffer.alloc(0), 'empty.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated upload attempt', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .attach('file', validPdfBuffer, 'sample.pdf');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Document Listing, Search & Pagination (GET /api/v1/documents)', () => {
    beforeEach(async () => {
      // Create 3 documents for User A
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validPdfBuffer, 'financial_report_2025.pdf')
        .field('title', 'Annual Financial Report')
        .field('description', 'Q4 audited financial statement')
        .field('tags', 'finance,audit');

      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validDocxBuffer, 'employee_handbook.docx')
        .field('title', 'HR Handbook')
        .field('tags', 'hr,benefits');

      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validTxtBuffer, 'api_specs.txt')
        .field('title', 'Backend Architecture Specifications');

      // Create 1 document for User B
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .attach('file', validMdBuffer, 'userb_secret_plan.md');
    });

    it('should list documents with pagination and isolate to authenticated user', async () => {
      const resA = await request(app)
        .get('/api/v1/documents?page=1&limit=2')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.documents.length).toBe(2);
      expect(resA.body.data.pagination.total).toBe(3);
      expect(resA.body.data.pagination.totalPages).toBe(2);
      expect(resA.body.data.pagination.hasNextPage).toBe(true);

      // Verify User B's documents do not appear in User A's results
      const titles = resA.body.data.documents.map((d: any) => d.originalName);
      expect(titles).not.toContain('userb_secret_plan.md');
    });

    it('should search across originalName, title, description, and tags', async () => {
      // Search by tag
      const resByTag = await request(app)
        .get('/api/v1/documents?search=finance')
        .set('Authorization', `Bearer ${tokenUserA}`);
      expect(resByTag.status).toBe(200);
      expect(resByTag.body.data.documents.length).toBe(1);
      expect(resByTag.body.data.documents[0].originalName).toBe('financial_report_2025.pdf');

      // Search by description
      const resByDesc = await request(app)
        .get('/api/v1/documents?search=audited')
        .set('Authorization', `Bearer ${tokenUserA}`);
      expect(resByDesc.status).toBe(200);
      expect(resByDesc.body.data.documents.length).toBe(1);

      // Search by original filename
      const resByName = await request(app)
        .get('/api/v1/documents?search=handbook')
        .set('Authorization', `Bearer ${tokenUserA}`);
      expect(resByName.status).toBe(200);
      expect(resByName.body.data.documents.length).toBe(1);
      expect(resByName.body.data.documents[0].originalName).toBe('employee_handbook.docx');
    });

    it('should filter documents by status', async () => {
      const res = await request(app)
        .get('/api/v1/documents?status=UPLOADED')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.documents.length).toBe(3);

      const resProcessed = await request(app)
        .get('/api/v1/documents?status=PROCESSED')
        .set('Authorization', `Bearer ${tokenUserA}`);
      expect(resProcessed.status).toBe(200);
      expect(resProcessed.body.data.documents.length).toBe(0);
    });
  });

  describe('Document Download & Ownership Isolation', () => {
    let docIdA: string;

    beforeEach(async () => {
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validPdfBuffer, 'confidential_a.pdf');
      docIdA = uploadRes.body.data.document._id;
    });

    it('should allow User A to download their own document with proper headers', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${docIdA}/download`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('confidential_a.pdf');
      expect(res.body.length).toBe(validPdfBuffer.length);
    });

    it('should prevent User B from accessing or downloading User A document (404)', async () => {
      // User B attempts to read metadata of User A's document
      const metaRes = await request(app)
        .get(`/api/v1/documents/${docIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`);
      expect(metaRes.status).toBe(404);

      // User B attempts to download User A's document
      const downloadRes = await request(app)
        .get(`/api/v1/documents/${docIdA}/download`)
        .set('Authorization', `Bearer ${tokenUserB}`);
      expect(downloadRes.status).toBe(404);

      // User B attempts to delete User A's document
      const deleteRes = await request(app)
        .delete(`/api/v1/documents/${docIdA}`)
        .set('Authorization', `Bearer ${tokenUserB}`);
      expect(deleteRes.status).toBe(404);
    });
  });

  describe('Document Deletion (DELETE /api/v1/documents/:id)', () => {
    it('should delete both MongoDB metadata and the physical stored file', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validTxtBuffer, 'to_be_deleted.txt');

      const docId = uploadRes.body.data.document._id;
      const storagePath = uploadRes.body.data.document.storagePath;

      // Verify physical file exists before deletion
      expect(await localStorageService.exists(storagePath)).toBe(true);

      // Delete document
      const deleteRes = await request(app)
        .delete(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify metadata is removed from MongoDB
      const docInDb = await DocumentModel.findById(docId);
      expect(docInDb).toBeNull();

      // Verify physical file is unlinked from storage
      const existsAfter = await localStorageService.exists(storagePath);
      expect(existsAfter).toBe(false);
    });
  });

  describe('Document Statistics (GET /api/v1/documents/stats)', () => {
    it('should calculate accurate user-specific document metrics', async () => {
      // Upload 2 documents for User A
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validPdfBuffer, 'stat_test.pdf');

      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', validTxtBuffer, 'stat_test.txt');

      const statsRes = await request(app)
        .get('/api/v1/documents/stats')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.success).toBe(true);

      const stats = statsRes.body.data.stats;
      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalStorageUsed).toBe(validPdfBuffer.length + validTxtBuffer.length);
      expect(stats.byExtension.pdf).toBe(1);
      expect(stats.byExtension.txt).toBe(1);
      expect(stats.recentDocuments.length).toBe(2);
    });
  });
});
