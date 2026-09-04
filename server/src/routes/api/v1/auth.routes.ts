import { Router } from 'express';
import { AuthController } from '../../../controllers/auth.controller';
import { validateRequest } from '../../../middleware/validate.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { authRateLimiter } from '../../../middleware/rateLimiter.middleware';
import { registerSchema, loginSchema } from '../../../validators/auth.validator';

const router = Router();

// Public auth endpoints with rate limiting and schema validation
router.post(
  '/register',
  authRateLimiter,
  validateRequest(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(loginSchema),
  AuthController.login
);

// Protected auth endpoints
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);

export default router;
