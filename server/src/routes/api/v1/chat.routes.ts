import { Router } from 'express';
import { ChatController } from '../../../controllers/chat.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { resolveOrgContext } from '../../../middleware/org.middleware';
import { validateRequest } from '../../../middleware/validate.middleware';
import {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema
} from '../../../validators/chat.validator';

const router = Router();

// All chat endpoints require JWT authentication
router.use(authenticate);
router.use(resolveOrgContext);

router.post(
  '/conversations',
  validateRequest(createConversationSchema),
  ChatController.createConversation
);

router.get(
  '/conversations',
  ChatController.listConversations
);

router.get(
  '/conversations/:id',
  validateRequest(conversationIdParamSchema),
  ChatController.getConversation
);

router.delete(
  '/conversations/:id',
  validateRequest(conversationIdParamSchema),
  ChatController.deleteConversation
);

router.post(
  '/conversations/:id/messages',
  validateRequest(sendMessageSchema),
  ChatController.sendMessage
);

export default router;
