import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import jszip from 'jszip';
import { createApp } from '../app';
import { DocumentModel } from '../models/Document';

// Helper to generate a 100% valid PDF binary buffer with custom text
function createTestPdfBuffer(text: string): Buffer {
  const EOL = '\r\n';
  let body = '%PDF-1.4' + EOL;
  const offsets = [0];

  offsets.push(Buffer.byteLength(body, 'binary'));
  body += '1 0 obj' + EOL + '<< /Type /Catalog /Pages 2 0 R >>' + EOL + 'endobj' + EOL;

  offsets.push(Buffer.byteLength(body, 'binary'));
  body += '2 0 obj' + EOL + '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' + EOL + 'endobj' + EOL;

  offsets.push(Buffer.byteLength(body, 'binary'));
  body += '3 0 obj' + EOL + '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>' + EOL + 'endobj' + EOL;

  offsets.push(Buffer.byteLength(body, 'binary'));
  body += '4 0 obj' + EOL + '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' + EOL + 'endobj' + EOL;

  offsets.push(Buffer.byteLength(body, 'binary'));
  const streamData = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
  body += '5 0 obj' + EOL + `<< /Length ${streamData.length} >>` + EOL + 'stream' + EOL + streamData + EOL + 'endstream' + EOL + 'endobj' + EOL;

  const startxref = Buffer.byteLength(body, 'binary');

  let xref = 'xref' + EOL;
  xref += '0 6' + EOL;
  xref += '0000000000 65535 f ' + EOL;
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n ' + EOL;
  }

  const trailer = 'trailer' + EOL + '<< /Size 6 /Root 1 0 R >>' + EOL + 'startxref' + EOL + startxref + EOL + '%%EOF' + EOL;
  return Buffer.from(body + xref + trailer, 'binary');
}

// Helper to generate a valid DOCX binary buffer with custom text
async function createTestDocxBuffer(text: string): Promise<Buffer> {
  const zip = new jszip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('Phase 3: Document Processing & Text Extraction Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let tokenUserA: string;
  let userIdA: string;
  let tokenUserB: string;

  const testUploadsDir = path.resolve(__dirname, '../../test_uploads_p3');

  beforeAll(async () => {
    process.env.UPLOAD_DIR = testUploadsDir;
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Extractor A',
        email: 'extract_a@vaultiq.com',
        password: 'Password123!'
      });
    tokenUserA = resA.body.data.token;
    userIdA = resA.body.data.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Extractor B',
        email: 'extract_b@vaultiq.com',
        password: 'Password123!'
      });
    tokenUserB = resB.body.data.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  describe('Text Extraction from Real Document Types (PDF, DOCX, TXT, MD)', () => {
    it('should extract and normalize text from a real TXT file', async () => {
      const rawText = '   VaultIQ Enterprise Knowledge Platform.   \r\n\r\n\r\nPhase 3 Text Extraction.  ';
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', Buffer.from(rawText), 'notes.txt');

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.document._id;

      // Trigger processing
      const procRes = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(procRes.status).toBe(200);
      expect(procRes.body.data.document.status).toBe('PROCESSED');
      expect(procRes.body.data.document.content.characterCount).toBeGreaterThan(0);
      expect(procRes.body.data.document.content.wordCount).toBe(8);
      expect(procRes.body.data.document.content.text).toBe(
        'VaultIQ Enterprise Knowledge Platform.\n\nPhase 3 Text Extraction.'
      );

      // Verify content endpoint
      const contentRes = await request(app)
        .get(`/api/v1/documents/${docId}/content`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(contentRes.status).toBe(200);
      expect(contentRes.body.data.content.text).toContain('VaultIQ Enterprise');

      // Verify status endpoint
      const statusRes = await request(app)
        .get(`/api/v1/documents/${docId}/processing`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status.status).toBe('PROCESSED');
    });

    it('should extract text from a real PDF file without mocking', async () => {
      const pdfBuffer = createTestPdfBuffer('VaultIQ PDF Extraction Success');
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', pdfBuffer, 'whitepaper.pdf');

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.document._id;

      const procRes = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(procRes.status).toBe(200);
      expect(procRes.body.data.document.status).toBe('PROCESSED');
      expect(procRes.body.data.document.content.text).toContain('VaultIQ PDF Extraction Success');
      expect(procRes.body.data.document.content.pageCount).toBe(1);
    });

    it('should extract text from a real DOCX file without mocking', async () => {
      const docxBuffer = await createTestDocxBuffer('VaultIQ DOCX Real Extraction Success');
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', docxBuffer, 'specification.docx');

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.document._id;

      const procRes = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(procRes.status).toBe(200);
      expect(procRes.body.data.document.status).toBe('PROCESSED');
      expect(procRes.body.data.document.content.text).toContain('VaultIQ DOCX Real Extraction Success');
    });

    it('should extract and preserve Markdown format from MD file', async () => {
      const mdContent = '# Header 1\n\n- Point A\n- Point B\n\nParagraph text here.';
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', Buffer.from(mdContent), 'guide.md');

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.document._id;

      const procRes = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(procRes.status).toBe(200);
      expect(procRes.body.data.document.status).toBe('PROCESSED');
      expect(procRes.body.data.document.content.text).toContain('# Header 1');
      expect(procRes.body.data.document.content.text).toContain('- Point A');
    });
  });

  describe('Error Handling, Retry Mechanism & Robustness', () => {
    it('should fail cleanly when processing a corrupted file with safe error message', async () => {
      // Create a corrupted PDF with random bytes
      const corruptedBuffer = Buffer.from('%PDF-1.4 CORRUPTED DATA INVALID OBJECTS 12345');
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', corruptedBuffer, 'corrupted.pdf');

      expect(uploadRes.status).toBe(201);
      const docId = uploadRes.body.data.document._id;

      // Processing should return error
      const procRes = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(procRes.status).toBe(500);

      // Verify status endpoint returns FAILED and clean error
      const statusRes = await request(app)
        .get(`/api/v1/documents/${docId}/processing`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status.status).toBe('FAILED');
      expect(statusRes.body.data.status.processingError).toBeTruthy();
      // Ensure no stack trace or absolute local path leaked
      expect(statusRes.body.data.status.processingError).not.toContain('node_modules');
      expect(statusRes.body.data.status.processingError).not.toContain('C:\\');

      // GET /content on failed document should return 400
      const contentRes = await request(app)
        .get(`/api/v1/documents/${docId}/content`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(contentRes.status).toBe(400);
      expect(contentRes.body.message).toContain('failed');
    });

    it('should allow retrying a previously FAILED document when file is valid', async () => {
      // Upload a plain text doc
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', Buffer.from('Initial text for retry'), 'retry_doc.txt');

      const docId = uploadRes.body.data.document._id;

      // Manually set status to FAILED in DB to simulate a previous transient failure
      await DocumentModel.updateOne(
        { _id: docId },
        { status: 'FAILED', processingError: 'Transient extraction timeout' }
      );

      // Verify it is currently FAILED
      let statusRes = await request(app)
        .get(`/api/v1/documents/${docId}/processing`)
        .set('Authorization', `Bearer ${tokenUserA}`);
      expect(statusRes.body.data.status.status).toBe('FAILED');

      // Trigger retry via POST /process
      const retryRes = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.data.document.status).toBe('PROCESSED');
      expect(retryRes.body.data.document.processingError).toBeNull();
      expect(retryRes.body.data.document.content.text).toBe('Initial text for retry');
    });
  });

  describe('Multi-Tenant Isolation & Ownership Enforcement', () => {
    it('should strictly prevent User B from processing or accessing User A document content', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .attach('file', Buffer.from('Confidential HR Data'), 'confidential.txt');

      const docId = uploadRes.body.data.document._id;

      // Process as User A
      await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      // User B tries to process User A's document
      const unauthorizedProc = await request(app)
        .post(`/api/v1/documents/${docId}/process`)
        .set('Authorization', `Bearer ${tokenUserB}`);
      expect(unauthorizedProc.status).toBe(404);

      // User B tries to view processing status
      const unauthorizedStatus = await request(app)
        .get(`/api/v1/documents/${docId}/processing`)
        .set('Authorization', `Bearer ${tokenUserB}`);
      expect(unauthorizedStatus.status).toBe(404);

      // User B tries to access extracted content
      const unauthorizedContent = await request(app)
        .get(`/api/v1/documents/${docId}/content`)
        .set('Authorization', `Bearer ${tokenUserB}`);
      expect(unauthorizedContent.status).toBe(404);
    });
  });

  describe('Document Stats with Processing Status Counts', () => {
    it('should accurately aggregate processedCount, processingCount, and failedCount', async () => {
      const statsRes = await request(app)
        .get('/api/v1/documents/stats')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(statsRes.status).toBe(200);
      const { stats } = statsRes.body.data;
      expect(stats.totalDocuments).toBeGreaterThan(0);
      expect(stats.processedCount).toBeGreaterThan(0);
      expect(typeof stats.failedCount).toBe('number');
      expect(typeof stats.processingCount).toBe('number');
      expect(typeof stats.uploadedCount).toBe('number');
    });
  });
});
