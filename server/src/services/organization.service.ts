import { Types } from 'mongoose';
import { OrganizationModel, IOrganization } from '../models/Organization';
import { OrganizationMemberModel, IOrganizationMember } from '../models/OrganizationMember';
import { UserModel } from '../models/User';
import { AuditService } from './audit.service';
import { OrgRole } from '../types';
import { logger } from '../utils/logger';

export class OrganizationService {
  /**
   * Helper to generate a clean slug from an organization name
   */
  public static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  /**
   * Creates a new organization and assigns the creator as OWNER
   */
  public static async createOrganization(
    userId: string,
    name: string,
    customSlug?: string,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ organization: IOrganization; membership: IOrganizationMember }> {
    const ownerId = new Types.ObjectId(userId);
    let slug = (customSlug || this.generateSlug(name)).toLowerCase();

    // Check slug collision and make unique if necessary
    let existing = await OrganizationModel.findOne({ slug }).lean();
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const organization = await OrganizationModel.create({
      name: name.trim(),
      slug,
      ownerId
    });

    const membership = await OrganizationMemberModel.create({
      organizationId: organization._id,
      userId: ownerId,
      role: 'OWNER'
    });

    await AuditService.log({
      organizationId: organization._id,
      actorId: ownerId,
      action: 'ORGANIZATION_CREATED',
      resourceType: 'ORGANIZATION',
      resourceId: organization._id.toString(),
      metadata: { name: organization.name, slug: organization.slug },
      ipAddress: clientInfo?.ip,
      userAgent: clientInfo?.userAgent
    });

    logger.info(`User ${userId} created organization ${organization.name} (${organization._id})`);
    return { organization, membership };
  }

  /**
   * Lists all organizations where the user is an active member
   */
  public static async listUserOrganizations(
    userId: string
  ): Promise<Array<{ organization: IOrganization; role: OrgRole }>> {
    const userObjectId = new Types.ObjectId(userId);

    const memberships = await OrganizationMemberModel.find({ userId: userObjectId })
      .populate('organizationId')
      .lean();

    const results: Array<{ organization: IOrganization; role: OrgRole }> = [];
    for (const m of memberships) {
      if (m.organizationId) {
        results.push({
          organization: m.organizationId as unknown as IOrganization,
          role: m.role
        });
      }
    }

    return results;
  }

  /**
   * Retrieves single organization details with membership check
   */
  public static async getOrganizationById(
    organizationId: string
  ): Promise<IOrganization> {
    const org = await OrganizationModel.findById(organizationId).lean();
    if (!org) {
      const error = new Error('Organization not found');
      (error as any).statusCode = 404;
      throw error;
    }
    return org as unknown as IOrganization;
  }

  /**
   * Updates organization profile (name, slug)
   */
  public static async updateOrganization(
    organizationId: string,
    actorId: string,
    updates: { name?: string; slug?: string },
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<IOrganization> {
    const org = await OrganizationModel.findById(organizationId);
    if (!org) {
      const error = new Error('Organization not found');
      (error as any).statusCode = 404;
      throw error;
    }

    if (updates.name) org.name = updates.name.trim();
    if (updates.slug && updates.slug !== org.slug) {
      const existingSlug = await OrganizationModel.findOne({
        slug: updates.slug,
        _id: { $ne: org._id }
      }).lean();
      if (existingSlug) {
        const error = new Error('Organization slug is already in use');
        (error as any).statusCode = 409;
        throw error;
      }
      org.slug = updates.slug.trim().toLowerCase();
    }

    await org.save();

    await AuditService.log({
      organizationId: org._id,
      actorId: new Types.ObjectId(actorId),
      action: 'ORGANIZATION_UPDATED',
      resourceType: 'ORGANIZATION',
      resourceId: org._id.toString(),
      metadata: updates,
      ipAddress: clientInfo?.ip,
      userAgent: clientInfo?.userAgent
    });

    return org;
  }

  /**
   * Lists all members of an organization with user details and roles
   */
  public static async listMembers(organizationId: string): Promise<any[]> {
    const members = await OrganizationMemberModel.find({
      organizationId: new Types.ObjectId(organizationId)
    })
      .populate('userId', 'name email avatar role')
      .sort({ joinedAt: 1 })
      .lean();

    return members.map((m: any) => ({
      membershipId: m._id.toString(),
      organizationId: m.organizationId.toString(),
      user: {
        id: m.userId?._id?.toString(),
        name: m.userId?.name,
        email: m.userId?.email,
        avatar: m.userId?.avatar
      },
      role: m.role,
      joinedAt: m.joinedAt
    }));
  }

  /**
   * Invites/adds an existing registered user to the organization by email
   */
  public static async inviteMember(
    organizationId: string,
    actorId: string,
    email: string,
    role: OrgRole,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<IOrganizationMember> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const targetUser = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();

    if (!targetUser) {
      const error = new Error(`User with email "${email}" was not found. They must register first.`);
      (error as any).statusCode = 404;
      throw error;
    }

    const existingMembership = await OrganizationMemberModel.findOne({
      organizationId: orgObjectId,
      userId: targetUser._id
    }).lean();

    if (existingMembership) {
      const error = new Error('User is already a member of this organization');
      (error as any).statusCode = 409;
      throw error;
    }

    const membership = await OrganizationMemberModel.create({
      organizationId: orgObjectId,
      userId: targetUser._id,
      role
    });

    await AuditService.log({
      organizationId: orgObjectId,
      actorId: new Types.ObjectId(actorId),
      action: 'MEMBER_INVITED',
      resourceType: 'MEMBER',
      resourceId: targetUser._id.toString(),
      metadata: { email: targetUser.email, role },
      ipAddress: clientInfo?.ip,
      userAgent: clientInfo?.userAgent
    });

    return membership;
  }

  /**
   * Updates an existing member's role with safeguards
   */
  public static async updateMemberRole(
    organizationId: string,
    actorId: string,
    targetUserId: string,
    newRole: OrgRole,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<IOrganizationMember> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const targetObjectId = new Types.ObjectId(targetUserId);

    const membership = await OrganizationMemberModel.findOne({
      organizationId: orgObjectId,
      userId: targetObjectId
    });

    if (!membership) {
      const error = new Error('Member not found in this organization');
      (error as any).statusCode = 404;
      throw error;
    }

    // Safeguard: Do not demote sole OWNER
    if (membership.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await OrganizationMemberModel.countDocuments({
        organizationId: orgObjectId,
        role: 'OWNER'
      });
      if (ownerCount <= 1) {
        const error = new Error('Cannot demote the only OWNER. Assign another OWNER first.');
        (error as any).statusCode = 400;
        throw error;
      }
    }

    const oldRole = membership.role;
    membership.role = newRole;
    await membership.save();

    await AuditService.log({
      organizationId: orgObjectId,
      actorId: new Types.ObjectId(actorId),
      action: 'MEMBER_ROLE_CHANGED',
      resourceType: 'MEMBER',
      resourceId: targetUserId,
      metadata: { oldRole, newRole },
      ipAddress: clientInfo?.ip,
      userAgent: clientInfo?.userAgent
    });

    return membership;
  }

  /**
   * Removes a member from the organization with safeguards
   */
  public static async removeMember(
    organizationId: string,
    actorId: string,
    targetUserId: string,
    clientInfo?: { ip?: string; userAgent?: string }
  ): Promise<void> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const targetObjectId = new Types.ObjectId(targetUserId);

    const membership = await OrganizationMemberModel.findOne({
      organizationId: orgObjectId,
      userId: targetObjectId
    });

    if (!membership) {
      const error = new Error('Member not found in this organization');
      (error as any).statusCode = 404;
      throw error;
    }

    // Safeguard: Prevent removing the only OWNER
    if (membership.role === 'OWNER') {
      const ownerCount = await OrganizationMemberModel.countDocuments({
        organizationId: orgObjectId,
        role: 'OWNER'
      });
      if (ownerCount <= 1) {
        const error = new Error('Cannot remove the only OWNER of the organization.');
        (error as any).statusCode = 400;
        throw error;
      }
    }

    await OrganizationMemberModel.deleteOne({ _id: membership._id });

    await AuditService.log({
      organizationId: orgObjectId,
      actorId: new Types.ObjectId(actorId),
      action: 'MEMBER_REMOVED',
      resourceType: 'MEMBER',
      resourceId: targetUserId,
      metadata: { removedRole: membership.role },
      ipAddress: clientInfo?.ip,
      userAgent: clientInfo?.userAgent
    });
  }
}
