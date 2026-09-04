import { z } from 'zod';

export const semanticSearchQuerySchema = z.object({
  query: z.object({
    q: z
      .string({ required_error: 'Search query parameter (q) is required' })
      .trim()
      .min(1, 'Search query cannot be empty')
      .max(500, 'Search query exceeds maximum allowed length of 500 characters'),
    limit: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const num = Number(val);
          return Number.isInteger(num) && num >= 1 && num <= 50;
        },
        { message: 'Limit must be an integer between 1 and 50' }
      )
      .transform((val) => (val ? parseInt(val, 10) : 10))
  })
});

export type SemanticSearchQuery = z.infer<typeof semanticSearchQuerySchema>['query'];
