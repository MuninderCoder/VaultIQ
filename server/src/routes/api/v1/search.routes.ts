import { Router } from 'express';
import { SearchController } from '../../../controllers/search.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { resolveOrgContext } from '../../../middleware/org.middleware';
import { validateRequest } from '../../../middleware/validate.middleware';
import { semanticSearchQuerySchema } from '../../../validators/search.validator';

const router = Router();

// Search strictly requires authentication
router.use(authenticate);
router.use(resolveOrgContext);

// GET /api/v1/search?q=...&limit=...
router.get('/', validateRequest(semanticSearchQuerySchema), SearchController.searchSemantic);

export default router;
