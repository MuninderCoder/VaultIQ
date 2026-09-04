import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Building2 } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { organizationService } from '../services/organizationService';
import { IOrganizationMember, OrgRole } from '../types/organization';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';

export const OrganizationMembersPage: React.FC = () => {
  const { activeOrganization, activeRole } = useOrganization();
  const [members, setMembers] = useState<IOrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('VIEWER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!activeOrganization) return;
    try {
      setIsLoading(true);
      const data = await organizationService.listMembers(activeOrganization._id);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeOrganization]);

  if (!activeOrganization) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">No Organization Selected</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Switch to an organization in the top navigation bar to manage team members and role governance.
          </p>
        </Card>
      </div>
    );
  }

  const canInvite = activeRole === 'OWNER' || activeRole === 'ADMIN';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await organizationService.inviteMember(activeOrganization._id, inviteEmail.trim(), inviteRole);
      await fetchMembers();
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('VIEWER');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to invite member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: OrgRole) => {
    try {
      await organizationService.updateMemberRole(activeOrganization._id, userId, newRole);
      await fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from ${activeOrganization.name}?`)) return;

    try {
      await organizationService.removeMember(activeOrganization._id, userId);
      await fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Team Members
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage members, role permissions, and access governance for {activeOrganization.name}.
          </p>
        </div>

        {canInvite && (
          <Button
            variant="primary"
            onClick={() => setIsInviteOpen(true)}
            className="gap-2 shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {/* Members Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined Date</th>
                {canInvite && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading organization members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  return (
                    <tr key={m.membershipId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                            {m.user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span>{m.user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{m.user.email}</td>
                      <td className="px-6 py-4">
                        {canInvite && m.role !== 'OWNER' ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user.id, e.target.value as OrgRole)}
                            className="text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <Badge variant={m.role === 'OWNER' ? 'info' : 'default'}>
                            {m.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      {canInvite && (
                        <td className="px-6 py-4 text-right">
                          {m.role !== 'OWNER' && (
                            <button
                              onClick={() => handleRemoveMember(m.user.id, m.user.name)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Member to Workspace"
        description="Add a registered user to your organization with defined RBAC permissions."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <Input
            label="User Email Address *"
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Role *
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ADMIN">ADMIN — Full document, member, and audit access</option>
              <option value="EDITOR">EDITOR — Can upload, edit, and search documents</option>
              <option value="VIEWER">VIEWER — Read-only access to organization documents and search</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add to Organization
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
