import { z } from 'zod';
import { env } from '../config/env';

export const createConversationSchema = z.object({
  body: z.object({
    title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional()
  })
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid conversation ID format')
  }),
  body: z.object({
    message: z
      .string({ required_error: 'Message text is required' })
      .trim()
      .min(1, 'Message cannot be empty')
      .max(
        env.CHAT_MAX_MESSAGE_LENGTH,
        `Message exceeds maximum length of ${env.CHAT_MAX_MESSAGE_LENGTH} characters`
      )
  })
});

export const conversationIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid conversation ID format')
  })
});
