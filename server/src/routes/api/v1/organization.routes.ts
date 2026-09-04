import { Router } from 'express';
import { OrganizationController } from '../../../controllers/organization.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { resolveOrgContext, requireOrgPermission } from '../../../middleware/org.middleware';
import { validateRequest } from '../../../middleware/validate.middleware';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  auditLogQuerySchema
} from '../../../validators/organization.validator';

const router = Router();

// All organization routes require authenticated user
router.use(authenticate);

// Organization root collection
router.post('/', validateRequest(createOrganizationSchema), OrganizationController.createOrganization);
router.get('/', OrganizationController.listUserOrganizations);

// Organization individual resource (Requires membership resolution)
router.get(
  '/:id',
  resolveOrgContext,
  requireOrgPermission('organization.read'),
  OrganizationController.getOrganizationById
);

router.patch(
  '/:id',
  resolveOrgContext,
  requireOrgPermission('organization.update'),
  validateRequest(updateOrganizationSchema),
  OrganizationController.updateOrganization
);

// Organization Members
router.get(
  '/:id/members',
  resolveOrgContext,
  requireOrgPermission('organization.member.read'),
  OrganizationController.listMembers
);

router.post(
  '/:id/members/invite',
  resolveOrgContext,
  requireOrgPermission('organization.member.invite'),
  validateRequest(inviteMemberSchema),
  OrganizationController.inviteMember
);

router.patch(
  '/:id/members/:userId',
  resolveOrgContext,
  requireOrgPermission('organization.member.update'),
  validateRequest(updateMemberRoleSchema),
  OrganizationController.updateMemberRole
);

router.delete(
  '/:id/members/:userId',
  resolveOrgContext,
  requireOrgPermission('organization.member.remove'),
  OrganizationController.removeMember
);

// Organization Audit Logs (Restricted to OWNER and ADMIN via audit.read permission)
router.get(
  '/:id/audit-logs',
  resolveOrgContext,
  requireOrgPermission('audit.read'),
  validateRequest(auditLogQuerySchema),
  OrganizationController.getAuditLogs
);

export default router;

