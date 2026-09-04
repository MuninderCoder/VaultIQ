import React, { useState, useEffect } from 'react';
import { Building2, Shield, Save } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { organizationService } from '../services/organizationService';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const OrganizationSettingsPage: React.FC = () => {
  const { activeOrganization, activeRole, refreshOrganizations } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeOrganization) {
      setName(activeOrganization.name);
      setSlug(activeOrganization.slug);
    }
  }, [activeOrganization]);

  if (!activeOrganization) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">No Organization Selected</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            You are currently working in your Personal Workspace. Switch to an organization or create a new one using the workspace selector in the top navbar.
          </p>
        </Card>
      </div>
    );
  }

  const canEdit = activeRole === 'OWNER' || activeRole === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !name.trim()) return;

    try {
      setIsSaving(true);
      setMessage(null);
      await organizationService.updateOrganization(activeOrganization._id, {
        name: name.trim(),
        slug: slug.trim() || undefined
      });
      await refreshOrganizations();
      setMessage({ type: 'success', text: 'Organization settings updated successfully.' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to update organization'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {activeOrganization.name} Settings
          </h1>
          <Badge variant="info">{activeRole}</Badge>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Manage enterprise workspace profile, security credentials, and organization identifiers.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* General Settings Card */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-600" />
          <span>Organization Profile</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
          <Input
            label="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            required
          />

          <Input
            label="Workspace Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!canEdit}
            helperText="Custom identifier used for workspace scoping and URLs."
          />

          {canEdit && (
            <div className="pt-2">
              <Button type="submit" variant="primary" isLoading={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* System Metadata Card */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-600" />
          <span>Security & Tenancy Information</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tenant ID
            </p>
            <p className="font-mono text-xs text-slate-800 mt-1 truncate">
              {activeOrganization._id}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Created Date
            </p>
            <p className="text-xs font-medium text-slate-800 mt-1">
              {new Date(activeOrganization.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your RBAC Role
            </p>
            <p className="text-xs font-bold text-brand-700 mt-1">{activeRole}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
