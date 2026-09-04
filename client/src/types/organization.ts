export type OrgRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface IOrganization {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizationMember {
  membershipId: string;
  organizationId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  role: OrgRole;
  joinedAt: string;
}

export interface IAuditLog {
  _id: string;
  organizationId: string;
  actorId: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
