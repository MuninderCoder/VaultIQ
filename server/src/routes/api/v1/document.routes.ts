import { Router } from 'express';
import { DocumentController } from '../../../controllers/document.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { documentUploadMiddleware } from '../../../middleware/upload.middleware';
import { validateRequest } from '../../../middleware/validate.middleware';
import {
  documentListQuerySchema,
  documentIdParamSchema
} from '../../../validators/document.validator';

const router = Router();

// All document endpoints strictly require authentication
router.use(authenticate);

// 1. Upload document (Multipart upload with signature & size validation)
router.post('/', documentUploadMiddleware, DocumentController.uploadDocument);

// 2. Document statistics (CRITICAL: Registered BEFORE /:id to prevent route shadowing)
router.get('/stats', DocumentController.getDocumentStats);

// 3. List documents (Server-side pagination, search, status filter, sort)
router.get('/', validateRequest(documentListQuerySchema), DocumentController.getDocuments);

// 4. Get single document metadata
router.get('/:id', validateRequest(documentIdParamSchema), DocumentController.getDocumentById);

// 5. Download document binary
router.get(
  '/:id/download',
  validateRequest(documentIdParamSchema),
  DocumentController.downloadDocument
);

// 6. Delete document
router.delete(
  '/:id',
  validateRequest(documentIdParamSchema),
  DocumentController.deleteDocument
);

export default router;
