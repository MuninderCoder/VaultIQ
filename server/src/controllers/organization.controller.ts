import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { OrganizationService } from '../services/organization.service';
import { AuditService } from '../services/audit.service';
import { ApiResponseHandler } from '../utils/apiResponse';

export class OrganizationController {
  public static createOrganization = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, slug } = req.body;
      const userId = req.user!.userId;

      const result = await OrganizationService.createOrganization(
        userId,
        name,
        slug,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      ApiResponseHandler.success(
        res,
        'Organization created successfully',
        result,
        201
      );
    } catch (error) {
      next(error);
    }
  };

  public static listUserOrganizations = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const orgs = await OrganizationService.listUserOrganizations(userId);
      ApiResponseHandler.success(res, 'Organizations retrieved successfully', orgs, 200);
    } catch (error) {
      next(error);
    }
  };

  public static getOrganizationById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const org = await OrganizationService.getOrganizationById(id);
      ApiResponseHandler.success(res, 'Organization details retrieved', org, 200);
    } catch (error) {
      next(error);
    }
  };

  public static updateOrganization = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const updatedOrg = await OrganizationService.updateOrganization(
        id,
        actorId,
        req.body,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      ApiResponseHandler.success(res, 'Organization updated successfully', updatedOrg, 200);
    } catch (error) {
      next(error);
    }
  };

  public static listMembers = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const members = await OrganizationService.listMembers(id);
      ApiResponseHandler.success(res, 'Organization members retrieved', members, 200);
    } catch (error) {
      next(error);
    }
  };

  public static inviteMember = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const { email, role } = req.body;

      const membership = await OrganizationService.inviteMember(
        id,
        actorId,
        email,
        role,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      ApiResponseHandler.success(
        res,
        'Member added to organization successfully',
        membership,
        201
      );
    } catch (error) {
      next(error);
    }
  };

  public static updateMemberRole = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id, userId } = req.params;
      const actorId = req.user!.userId;
      const { role } = req.body;

      const updatedMembership = await OrganizationService.updateMemberRole(
        id,
        actorId,
        userId,
        role,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      ApiResponseHandler.success(
        res,
        'Member role updated successfully',
        updatedMembership,
        200
      );
    } catch (error) {
      next(error);
    }
  };

  public static removeMember = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id, userId } = req.params;
      const actorId = req.user!.userId;

      await OrganizationService.removeMember(
        id,
        actorId,
        userId,
        { ip: req.ip, userAgent: req.headers['user-agent'] }
      );

      ApiResponseHandler.success(
        res,
        'Member removed from organization successfully',
        null,
        200
      );
    } catch (error) {
      next(error);
    }
  };

  public static getAuditLogs = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { page, limit, action, actorId, resourceType, startDate, endDate } = req.query as any;

      const result = await AuditService.getLogs({
        organizationId: id,
        page,
        limit,
        action,
        actorId,
        resourceType,
        startDate,
        endDate
      });

      ApiResponseHandler.success(res, 'Audit logs retrieved successfully', result, 200);
    } catch (error) {
      next(error);
    }
  };
}
