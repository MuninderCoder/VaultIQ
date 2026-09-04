import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { OrganizationModel } from '../models/Organization';
import { OrganizationMemberModel } from '../models/OrganizationMember';
import { AuthorizationService, Permission } from '../services/authorization.service';
import { ApiResponseHandler } from '../utils/apiResponse';

/**
 * Validates organization membership for requests carrying an organization context.
 * x-organization-id is strictly treated as a context selector, NEVER trusted as authorization.
 * Resolves active membership from DB and attaches orgMember context to req.
 */
export const resolveOrgContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Check selector from header or route parameters
    const orgIdHeader = req.headers['x-organization-id'] as string | undefined;
    let orgIdParam = req.params.organizationId;
    if (!orgIdParam && req.baseUrl.includes('/organizations')) {
      orgIdParam = req.params.id;
    }
    const orgIdCandidate = (orgIdHeader || orgIdParam || '').trim();

    // If no org selector is provided, proceed without org context (unscoped personal resource path)
    if (!orgIdCandidate) {
      return next();
    }

    if (!Types.ObjectId.isValid(orgIdCandidate)) {
      ApiResponseHandler.error(res, 'Invalid organization ID format', null, 400);
      return;
    }

    if (!req.user?.userId) {
      ApiResponseHandler.error(res, 'Authentication required', null, 401);
      return;
    }

    const orgObjectId = new Types.ObjectId(orgIdCandidate);
    const userObjectId = new Types.ObjectId(req.user.userId);

    // 2. Verify organization exists
    const organization = await OrganizationModel.findById(orgObjectId).lean();
    if (!organization) {
      ApiResponseHandler.error(res, 'Organization not found', null, 404);
      return;
    }

    // 3. Verify authenticated user's membership in DB (Never trust client header alone!)
    const membership = await OrganizationMemberModel.findOne({
      organizationId: orgObjectId,
      userId: userObjectId
    }).lean();

    if (!membership) {
      ApiResponseHandler.error(
        res,
        'Forbidden: You are not a member of this organization',
        null,
        403
      );
      return;
    }

    // 4. Attach verified organization and permissions context
    req.organizationId = organization._id.toString();
    req.orgMember = {
      organizationId: organization._id.toString(),
      organizationName: organization.name,
      role: membership.role,
      permissions: AuthorizationService.getPermissionsForRole(membership.role)
    };

    next();
  } catch (error: any) {
    next(error);
  }
};

/**
 * Route guard requiring active organization membership and a specific RBAC permission.
 */
export const requireOrgPermission = (permission: Permission) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // First ensure organization context is resolved
    if (!req.orgMember) {
      await resolveOrgContext(req, res, () => {});
    }

    if (res.headersSent) {
      return;
    }

    if (!req.orgMember) {
      ApiResponseHandler.error(
        res,
        'Organization context required for this operation',
        null,
        400
      );
      return;
    }

    const hasPerm = AuthorizationService.hasPermission(req.orgMember.role, permission);
    if (!hasPerm) {
      ApiResponseHandler.error(
        res,
        `Forbidden: You lack the required permission: ${permission}`,
        null,
        403
      );
      return;
    }

    next();
  };
};
