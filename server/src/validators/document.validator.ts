import { z } from 'zod';
import { Types } from 'mongoose';

export const documentListQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 10)) : 10)),
    search: z.string().trim().optional(),
    status: z
      .enum(['ALL', 'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'])
      .optional(),
    sort: z.string().trim().optional().default('-uploadedAt')
  })
});

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid document ID format'
    })
  })
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>['query'];
