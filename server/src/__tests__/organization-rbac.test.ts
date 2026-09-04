import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app';
import { OrganizationModel } from '../models/Organization';
import { OrganizationMemberModel } from '../models/OrganizationMember';
import { DocumentModel } from '../models/Document';
import { AuditLogModel } from '../models/AuditLog';
import { RagService } from '../rag/rag.service';
import { MockLLMService } from '../llm/mock.llm';
import { LLMServiceFactory } from '../llm/llm.service';

describe('Phase 6: Enterprise Collaboration & Access Governance Test Suite', () => {
  jest.setTimeout(120000);
  let mongoServer: MongoMemoryServer;
  const app = createApp();

  let tokenOwnerA: string;
  let userIdOwnerA: string;

  let tokenAdminA: string;
  let userIdAdminA: string;

  let tokenEditorA: string;
  let userIdEditorA: string;

  let tokenViewerA: string;
  let userIdViewerA: string;

  let tokenUserB: string;
  let userIdUserB: string;

  let orgAId: string;
  let orgBId: string;

  const testUploadsDir = path.resolve(__dirname, '../../test_uploads_p6');

  beforeAll(async () => {
    process.env.UPLOAD_DIR = testUploadsDir;
    process.env.NODE_ENV = 'test';
    process.env.LLM_PROVIDER = 'mock';
    process.env.EMBEDDING_PROVIDER = 'mock';
    process.env.VECTOR_SEARCH_ENGINE = 'local';
    LLMServiceFactory.setService(new MockLLMService());

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }

    // Register User Owner A
    const resOwnerA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Org A Owner', email: 'ownerA@phase6test.com', password: 'Password123!' });
    tokenOwnerA = resOwnerA.body.data.token;
    userIdOwnerA = resOwnerA.body.data.user.id;

    // Register User Admin A
    const resAdminA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Org A Admin', email: 'adminA@phase6test.com', password: 'Password123!' });
    tokenAdminA = resAdminA.body.data.token;
    userIdAdminA = resAdminA.body.data.user.id;

    // Register User Editor A
    const resEditorA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Org A Editor', email: 'editorA@phase6test.com', password: 'Password123!' });
    tokenEditorA = resEditorA.body.data.token;
    userIdEditorA = resEditorA.body.data.user.id;

    // Register User Viewer A
    const resViewerA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Org A Viewer', email: 'viewerA@phase6test.com', password: 'Password123!' });
    tokenViewerA = resViewerA.body.data.token;
    userIdViewerA = resViewerA.body.data.user.id;

    // Register External User B
    const resUserB = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'External User B', email: 'userB@phase6test.com', password: 'Password123!' });
    tokenUserB = resUserB.body.data.token;
    userIdUserB = resUserB.body.data.user.id;
  }, 180000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  // ==========================================
  // SECTION 1: ORGANIZATION LIFECYCLE
  // ==========================================
  describe('A. Organization Lifecycle & Creation', () => {
    it('should allow authenticated user to create a new organization and become OWNER', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({
          name: 'Acme Enterprise',
          slug: 'phase6-acme'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.name).toBe('Acme Enterprise');
      expect(res.body.data.organization.slug).toBe('phase6-acme');
      expect(res.body.data.organization.ownerId).toBe(userIdOwnerA);
      expect(res.body.data.membership.role).toBe('OWNER');

      orgAId = res.body.data.organization._id;

      // Verify membership record in DB
      const member = await OrganizationMemberModel.findOne({
        organizationId: new Types.ObjectId(orgAId),
        userId: new Types.ObjectId(userIdOwnerA)
      });
      expect(member).toBeTruthy();
      expect(member?.role).toBe('OWNER');
    });

    it('should create Org B for external User B', async () => {
      const res = await request(app)
        .post('/api/v1/organizations')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          name: 'Beta Corp',
          slug: 'phase6-beta'
        });

      expect(res.status).toBe(201);
      orgBId = res.body.data.organization._id;
    });

    it('should list all organizations where the user has active membership', async () => {
      const res = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].organization._id).toBe(orgAId);
      expect(res.body.data[0].role).toBe('OWNER');
    });

    it('should retrieve organization details when caller is an active member', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Acme Enterprise');
    });

    it('should forbid non-members from retrieving organization details (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(403);
    });

    it('should allow OWNER to update organization name and slug', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ name: 'Acme Enterprise Global' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Acme Enterprise Global');
    });
  });

  // ==========================================
  // SECTION 2: MEMBERSHIP & ROLE GOVERNANCE
  // ==========================================
  describe('B. Organization Membership & Role Governance', () => {
    it('should allow OWNER to invite members with specific roles (ADMIN, EDITOR, VIEWER)', async () => {
      // Invite Admin
      const resAdmin = await request(app)
        .post(`/api/v1/organizations/${orgAId}/members/invite`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ email: 'adminA@phase6test.com', role: 'ADMIN' });
      expect(resAdmin.status).toBe(201);
      expect(resAdmin.body.data.role).toBe('ADMIN');

      // Invite Editor
      const resEditor = await request(app)
        .post(`/api/v1/organizations/${orgAId}/members/invite`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ email: 'editorA@phase6test.com', role: 'EDITOR' });
      expect(resEditor.status).toBe(201);
      expect(resEditor.body.data.role).toBe('EDITOR');

      // Invite Viewer
      const resViewer = await request(app)
        .post(`/api/v1/organizations/${orgAId}/members/invite`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ email: 'viewerA@phase6test.com', role: 'VIEWER' });
      expect(resViewer.status).toBe(201);
      expect(resViewer.body.data.role).toBe('VIEWER');
    });

    it('should reject inviting a user who is already a member (409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/members/invite`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ email: 'adminA@phase6test.com', role: 'ADMIN' });

      expect(res.status).toBe(409);
    });

    it('should list all members of the organization with roles', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/members`)
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4); // Owner, Admin, Editor, Viewer
    });

    it('should allow ADMIN to update member role from VIEWER to EDITOR', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${orgAId}/members/${userIdViewerA}`)
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({ role: 'EDITOR' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('EDITOR');

      // Restore to VIEWER for subsequent tests
      await request(app)
        .patch(`/api/v1/organizations/${orgAId}/members/${userIdViewerA}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ role: 'VIEWER' });
    });

    it('should safeguard against demoting the sole OWNER (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${orgAId}/members/${userIdOwnerA}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('only OWNER');
    });

    it('should safeguard against removing the sole OWNER (400 Bad Request)', async () => {
      const res = await request(app)
        .delete(`/api/v1/organizations/${orgAId}/members/${userIdOwnerA}`)
        .set('Authorization', `Bearer ${tokenOwnerA}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('only OWNER');
    });
  });

  // ==========================================
  // SECTION 3: RBAC PERMISSION ENFORCEMENT
  // ==========================================
  describe('C. RBAC Matrix Enforcement & Permission Guards', () => {
    it('should forbid VIEWER from inviting new members (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/organizations/${orgAId}/members/invite`)
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .send({ email: 'userB@phase6test.com', role: 'VIEWER' });

      expect(res.status).toBe(403);
    });

    it('should forbid EDITOR from updating organization settings (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/organizations/${orgAId}`)
        .set('Authorization', `Bearer ${tokenEditorA}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('should forbid VIEWER from accessing organization audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenViewerA}`);

      expect(res.status).toBe(403);
    });

    it('should forbid EDITOR from accessing organization audit logs (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenEditorA}`);

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN and OWNER to access organization audit logs (200 OK)', async () => {
      const resAdmin = await request(app)
        .get(`/api/v1/organizations/${orgAId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenAdminA}`);
      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.logs.length).toBeGreaterThanOrEqual(1);

      const resOwner = await request(app)
        .get(`/api/v1/organizations/${orgAId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenOwnerA}`);
      expect(resOwner.status).toBe(200);
    });
  });

  // ==========================================
  // SECTION 4: DOCUMENT COLLABORATION & VISIBILITY
  // ==========================================
  describe('D. Document Collaboration & Visibility Isolation', () => {
    let docOrgVisId: string;
    let docPrivateVisId: string;

    it('should allow OWNER to upload document with ORGANIZATION visibility', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .set('x-organization-id', orgAId)
        .attach('file', Buffer.from('Acme Org Policy: All full-time employees receive 25 days annual paid time off.'), 'phase6_org_policy.txt')
        .field('visibility', 'ORGANIZATION')
        .field('title', 'Acme Paid Leave Policy');

      expect(res.status).toBe(201);
      expect(res.body.data.document.visibility).toBe('ORGANIZATION');
      expect(res.body.data.document.organizationId).toBe(orgAId);

      docOrgVisId = res.body.data.document._id;
    });

    it('should allow OWNER to upload document with PRIVATE visibility inside org', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .set('x-organization-id', orgAId)
        .attach('file', Buffer.from('Acme Secret: Executive bonus pool allocation is 10 million dollars.'), 'phase6_private_bonus.txt')
        .field('visibility', 'PRIVATE')
        .field('title', 'Acme Executive Bonus Private');

      expect(res.status).toBe(201);
      expect(res.body.data.document.visibility).toBe('PRIVATE');
      expect(res.body.data.document.organizationId).toBe(orgAId);

      docPrivateVisId = res.body.data.document._id;
    });

    it('should allow VIEWER in Org A to view and download ORGANIZATION visibility document', async () => {
      const resGet = await request(app)
        .get(`/api/v1/documents/${docOrgVisId}`)
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId);

      expect(resGet.status).toBe(200);
      expect(resGet.body.data.document.originalName).toBe('phase6_org_policy.txt');

      const resDownload = await request(app)
        .get(`/api/v1/documents/${docOrgVisId}/download`)
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId);

      expect(resDownload.status).toBe(200);
      expect(resDownload.text).toContain('Acme Org Policy');
    });

    it('should strictly HIDE PRIVATE document from VIEWER in the same organization (404)', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${docPrivateVisId}`)
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId);

      expect(res.status).toBe(404);
    });

    it('should strictly HIDE Org A documents from User B in Org B (404/Cross-Tenant Isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${docOrgVisId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('x-organization-id', orgBId);

      expect(res.status).toBe(404);
    });

    it('should filter document list in Org A: VIEWER sees ORGANIZATION docs, but not other users PRIVATE docs', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId);

      expect(res.status).toBe(200);
      const names = res.body.data.documents.map((d: any) => d.originalName);
      expect(names).toContain('phase6_org_policy.txt');
      expect(names).not.toContain('phase6_private_bonus.txt');
    });
  });

  // ==========================================
  // SECTION 5: ORGANIZATION-AWARE SEARCH & RAG
  // ==========================================
  describe('E. Organization-Aware Pre-Retrieval Semantic Search & RAG', () => {
    beforeAll(async () => {
      // Process and Index Org A Document
      const docA = await DocumentModel.findOne({ originalName: 'phase6_org_policy.txt' });
      await request(app)
        .post(`/api/v1/documents/${docA!._id}/process`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .set('x-organization-id', orgAId);

      await request(app)
        .post(`/api/v1/documents/${docA!._id}/index`)
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .set('x-organization-id', orgAId);

      // Upload, Process, and Index Org B Document
      const resUploadB = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('x-organization-id', orgBId)
        .attach('file', Buffer.from('Beta Org Policy: Beta employees receive 12 days paid time off strictly.'), 'phase6_beta_policy.txt')
        .field('visibility', 'ORGANIZATION')
        .field('title', 'Beta Corp Policy');

      const docBId = resUploadB.body.data.document._id;
      await request(app)
        .post(`/api/v1/documents/${docBId}/process`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('x-organization-id', orgBId);

      await request(app)
        .post(`/api/v1/documents/${docBId}/index`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('x-organization-id', orgBId);
    });

    it('should pre-filter semantic search to Org A: Viewer in Org A retrieves Acme policy, NEVER Beta policy', async () => {
      const searchRes = await request(app)
        .get('/api/v1/search?q=employees+paid+time+off')
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.results.length).toBeGreaterThan(0);

      const docNames = searchRes.body.data.results.map((r: any) => r.documentName);
      expect(docNames).toContain('phase6_org_policy.txt');
      expect(docNames).not.toContain('phase6_beta_policy.txt');
    });

    it('should pre-filter semantic search to Org B: User B in Org B retrieves Beta policy, NEVER Acme policy', async () => {
      const searchRes = await request(app)
        .get('/api/v1/search?q=employees+paid+time+off')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('x-organization-id', orgBId);

      expect(searchRes.status).toBe(200);
      const docNames = searchRes.body.data.results.map((r: any) => r.documentName);
      expect(docNames).toContain('phase6_beta_policy.txt');
      expect(docNames).not.toContain('phase6_org_policy.txt');
    });

    it('should synthesize grounded RAG answer in Org A using ONLY Org A indexed chunks', async () => {
      const convRes = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId)
        .send({ title: 'Phase6 Org A Leave Discussion' });

      expect(convRes.status).toBe(201);
      const convId = convRes.body.data.conversation._id;

      const msgRes = await request(app)
        .post(`/api/v1/chat/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId)
        .send({ message: 'How many days of paid time off do full-time employees receive?' });

      expect(msgRes.status).toBe(200);
      expect(msgRes.body.data.isGrounded).toBe(true);
      expect(msgRes.body.data.sources.length).toBeGreaterThan(0);
      expect(msgRes.body.data.sources[0].documentName).toBe('phase6_org_policy.txt');
    });

    it('should return controlled fallback when querying outside knowledge in Org A without hallucination', async () => {
      const convRes = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId)
        .send({ title: 'Phase6 Unrelated Astronomy' });

      const convId = convRes.body.data.conversation._id;
      const msgRes = await request(app)
        .post(`/api/v1/chat/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${tokenViewerA}`)
        .set('x-organization-id', orgAId)
        .send({ message: 'What is the mass of the Andromeda galaxy?' });

      expect(msgRes.status).toBe(200);
      expect(msgRes.body.data.isGrounded).toBe(false);
      expect(msgRes.body.data.assistantMessage.content).toBe(
        RagService.INSUFFICIENT_EVIDENCE_RESPONSE
      );
    });

    it('should isolate chat conversations by organization: User B cannot access Org A conversation (404)', async () => {
      const convRes = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${tokenOwnerA}`)
        .set('x-organization-id', orgAId)
        .send({ title: 'Phase6 Confidential Org A Chat' });

      const convId = convRes.body.data.conversation._id;

      const getRes = await request(app)
        .get(`/api/v1/chat/conversations/${convId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .set('x-organization-id', orgBId);

      expect(getRes.status).toBe(404);
    });
  });

  // ==========================================
  // SECTION 6: AUDIT LOGGING INTEGRITY
  // ==========================================
  describe('F. Audit Logging & Tenant Isolation', () => {
    it('should have recorded security actions in Org A audit log', async () => {
      const res = await request(app)
        .get(`/api/v1/organizations/${orgAId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(res.status).toBe(200);
      const actions = res.body.data.logs.map((l: any) => l.action);
      expect(actions).toContain('ORGANIZATION_CREATED');
      expect(actions).toContain('MEMBER_INVITED');
      expect(actions).toContain('DOCUMENT_UPLOADED');
    });

    it('should verify audit logs are tenant-isolated: Org B audit logs do NOT leak Org A events', async () => {
      const resB = await request(app)
        .get(`/api/v1/organizations/${orgBId}/audit-logs`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(resB.status).toBe(200);
      resB.body.data.logs.forEach((log: any) => {
        expect(log.organizationId).toBe(orgBId);
      });
    });

    it('should not contain passwords, API keys, or secret tokens in audit log metadata', async () => {
      const logs = await AuditLogModel.find({ organizationId: orgAId }).lean();
      logs.forEach((log) => {
        const str = JSON.stringify(log.metadata || {}).toLowerCase();
        expect(str).not.toContain('password123');
        expect(str).not.toContain('sk-');
      });
    });
  });
});
