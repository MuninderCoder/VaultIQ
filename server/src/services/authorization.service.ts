import { Types } from 'mongoose';
import { OrgRole, DocumentVisibility } from '../types';

export type Permission =
  | 'organization.read'
  | 'organization.update'
  | 'organization.delete'
  | 'organization.member.read'
  | 'organization.member.invite'
  | 'organization.member.update'
  | 'organization.member.remove'
  | 'document.read'
  | 'document.create'
  | 'document.update'
  | 'document.delete'
  | 'chat.read'
  | 'chat.create'
  | 'audit.read';

export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  OWNER: [
    'organization.read',
    'organization.update',
    'organization.delete',
    'organization.member.read',
    'organization.member.invite',
    'organization.member.update',
    'organization.member.remove',
    'document.read',
    'document.create',
    'document.update',
    'document.delete',
    'chat.read',
    'chat.create',
    'audit.read'
  ],
  ADMIN: [
    'organization.read',
    'organization.update',
    'organization.member.read',
    'organization.member.invite',
    'organization.member.update',
    'organization.member.remove',
    'document.read',
    'document.create',
    'document.update',
    'document.delete',
    'chat.read',
    'chat.create',
    'audit.read'
  ],
  EDITOR: [
    'organization.read',
    'organization.member.read',
    'document.read',
    'document.create',
    'document.update',
    'chat.read',
    'chat.create'
  ],
  VIEWER: [
    'organization.read',
    'organization.member.read',
    'document.read',
    'chat.read',
    'chat.create'
  ]
};

export class AuthorizationService {
  /**
   * Retrieves full permission list mapped to a given organization role
   */
  public static getPermissionsForRole(role: OrgRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Validates if a given role possesses a specific permission
   */
  public static hasPermission(role: OrgRole | undefined | null, permission: Permission): boolean {
    if (!role) return false;
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  /**
   * Checks whether a user can read/view a document.
   * - Unscoped documents: Must be the owner.
   * - Organization documents:
   *   1. User must be a member of the organization with document.read permission.
   *   2. If visibility is 'ORGANIZATION': Any member with document.read can view.
   *   3. If visibility is 'PRIVATE': ONLY the document owner can view.
   */
  public static canReadDocument(
    userId: string,
    doc: {
      owner: Types.ObjectId | string;
      organizationId?: Types.ObjectId | string | null;
      visibility?: DocumentVisibility;
    },
    userOrgRole?: OrgRole | null,
    callerOrgId?: string | null
  ): boolean {
    const isOwner = doc.owner.toString() === userId;

    // Unscoped personal document: Strictly owner-only
    if (!doc.organizationId) {
      return isOwner;
    }

    // Cross-tenant guard: If caller specified an organization, it MUST match the document's organization
    if (callerOrgId && doc.organizationId.toString() !== callerOrgId.toString()) {
      return false;
    }

    // Owner can always read their own document within its organization
    if (isOwner) {
      return true;
    }

    // Non-owner: Must have active role with document.read in this organization
    if (!userOrgRole || !this.hasPermission(userOrgRole, 'document.read')) {
      return false;
    }

    // Private document within org: Strictly owner-only
    if (doc.visibility === 'PRIVATE') {
      return false;
    }

    // Organization visibility: Accessible to all org members with document.read
    return true;
  }

  /**
   * Checks whether a user can update a document within an organization
   */
  public static canUpdateDocument(
    userId: string,
    doc: {
      owner: Types.ObjectId | string;
      organizationId?: Types.ObjectId | string | null;
      visibility?: DocumentVisibility;
    },
    userOrgRole?: OrgRole | null,
    callerOrgId?: string | null
  ): boolean {
    const isOwner = doc.owner.toString() === userId;

    if (!doc.organizationId) {
      return isOwner;
    }

    if (callerOrgId && doc.organizationId.toString() !== callerOrgId.toString()) {
      return false;
    }

    if (!userOrgRole || !this.hasPermission(userOrgRole, 'document.update')) {
      return false;
    }

    // OWNER and ADMIN can update any org document; EDITOR can update their own or ORGANIZATION visibility docs
    if (userOrgRole === 'OWNER' || userOrgRole === 'ADMIN') {
      return true;
    }

    return isOwner;
  }

  /**
   * Checks whether a user can delete a document within an organization
   */
  public static canDeleteDocument(
    userId: string,
    doc: {
      owner: Types.ObjectId | string;
      organizationId?: Types.ObjectId | string | null;
    },
    userOrgRole?: OrgRole | null,
    callerOrgId?: string | null
  ): boolean {
    const isOwner = doc.owner.toString() === userId;

    if (!doc.organizationId) {
      return isOwner;
    }

    if (callerOrgId && doc.organizationId.toString() !== callerOrgId.toString()) {
      return false;
    }

    if (!userOrgRole || !this.hasPermission(userOrgRole, 'document.delete')) {
      return false;
    }

    // OWNER and ADMIN can delete any org document; otherwise owner-only
    if (userOrgRole === 'OWNER' || userOrgRole === 'ADMIN') {
      return true;
    }

    return isOwner;
  }
}
