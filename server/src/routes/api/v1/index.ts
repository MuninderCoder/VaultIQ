import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import documentRoutes from './document.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);

export default router;
