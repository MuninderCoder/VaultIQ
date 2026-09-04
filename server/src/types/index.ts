import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'USER' | 'ADMIN';
export type OrgRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type DocumentVisibility = 'PRIVATE' | 'ORGANIZATION';

export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface IOrgMemberContext {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: IAuthPayload;
  organizationId?: string;
  orgMember?: IOrgMemberContext;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

