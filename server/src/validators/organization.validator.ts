import { z } from 'zod';

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Organization name is required' })
      .trim()
      .min(2, 'Organization name must be at least 2 characters')
      .max(100, 'Organization name cannot exceed 100 characters'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens')
      .min(2, 'Slug must be at least 2 characters')
      .max(50, 'Slug cannot exceed 50 characters')
      .optional()
  })
});

export const updateOrganizationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Organization name must be at least 2 characters')
      .max(100, 'Organization name cannot exceed 100 characters')
      .optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens')
      .min(2, 'Slug must be at least 2 characters')
      .max(50, 'Slug cannot exceed 50 characters')
      .optional()
  })
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Member email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address format'),
    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER'], {
      errorMap: () => ({ message: 'Role must be ADMIN, EDITOR, or VIEWER' })
    })
  })
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'], {
      errorMap: () => ({ message: 'Role must be OWNER, ADMIN, EDITOR, or VIEWER' })
    })
  })
});

export const auditLogQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
    action: z.string().optional(),
    actorId: z.string().optional(),
    resourceType: z.string().optional(),
    startDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    endDate: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
  })
});
