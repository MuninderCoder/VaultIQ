import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import documentRoutes from './document.routes';
import searchRoutes from './search.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);

export default router;
