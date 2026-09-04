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
    visibility: z.enum(['ALL', 'PRIVATE', 'ORGANIZATION']).optional(),
    organizationId: z.string().optional(),
    sort: z.string().trim().optional().default('-uploadedAt')
  })
});

export const uploadDocumentBodySchema = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  visibility: z.enum(['PRIVATE', 'ORGANIZATION']).optional().default('PRIVATE'),
  organizationId: z.string().optional()
});

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().refine((val) => Types.ObjectId.isValid(val), {
      message: 'Invalid document ID format'
    })
  })
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>['query'];

