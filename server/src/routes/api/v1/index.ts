import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import documentRoutes from './document.routes';
import searchRoutes from './search.routes';
import chatRoutes from './chat.routes';
import organizationRoutes from './organization.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);
router.use('/chat', chatRoutes);
router.use('/organizations', organizationRoutes);

export default router;


