import { api } from './api';
import { IOrganization, IOrganizationMember, IAuditLog, OrgRole } from '../types/organization';

export interface CreateOrgPayload {
  name: string;
  slug?: string;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}

export const organizationService = {
  createOrganization: async (payload: CreateOrgPayload) => {
    const res = await api.post('/organizations', payload);
    return res.data;
  },

  listUserOrganizations: async (): Promise<Array<{ organization: IOrganization; role: OrgRole }>> => {
    const res = await api.get('/organizations');
    return res.data.data;
  },

  getOrganizationById: async (id: string): Promise<IOrganization> => {
    const res = await api.get(`/organizations/${id}`);
    return res.data.data;
  },

  updateOrganization: async (id: string, updates: { name?: string; slug?: string }) => {
    const res = await api.patch(`/organizations/${id}`, updates);
    return res.data.data;
  },

  listMembers: async (id: string): Promise<IOrganizationMember[]> => {
    const res = await api.get(`/organizations/${id}/members`);
    return res.data.data;
  },

  inviteMember: async (id: string, email: string, role: OrgRole) => {
    const res = await api.post(`/organizations/${id}/members/invite`, { email, role });
    return res.data.data;
  },

  updateMemberRole: async (id: string, userId: string, role: OrgRole) => {
    const res = await api.patch(`/organizations/${id}/members/${userId}`, { role });
    return res.data.data;
  },

  removeMember: async (id: string, userId: string) => {
    const res = await api.delete(`/organizations/${id}/members/${userId}`);
    return res.data;
  },

  getAuditLogs: async (id: string, params?: AuditLogQueryParams): Promise<{
    logs: IAuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const res = await api.get(`/organizations/${id}/audit-logs`, { params });
    return res.data.data;
  }
};
