import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Plus, User } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { organizationService } from '../services/organizationService';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

export const OrganizationSwitcher: React.FC = () => {
  const { organizations, activeOrganization, activeRole, switchOrganization, refreshOrganizations } =
    useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await organizationService.createOrganization({
        name: newOrgName.trim(),
        slug: newOrgSlug.trim() || undefined
      });
      await refreshOrganizations();
      setIsModalOpen(false);
      setNewOrgName('');
      setNewOrgSlug('');
      switchOrganization(res.data.organization._id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
        >
          {activeOrganization ? (
            <Building2 className="w-3.5 h-3.5 text-brand-600" />
          ) : (
            <User className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="max-w-[120px] truncate font-semibold">
            {activeOrganization ? activeOrganization.name : 'Personal Workspace'}
          </span>
          {activeRole && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-50 text-brand-700 font-bold">
              {activeRole}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-lg z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Workspaces
              </div>

              {/* Personal Workspace Option */}
              <button
                onClick={() => {
                  switchOrganization(null);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="font-semibold text-slate-800">Personal Workspace</p>
                    <p className="text-[10px] text-slate-400">Personal documents & search</p>
                  </div>
                </div>
                {!activeOrganization && <Check className="w-3.5 h-3.5 text-brand-600" />}
              </button>

              <div className="my-1 border-t border-slate-100" />

              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Organizations
              </div>

              {organizations.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic">No organizations joined</div>
              ) : (
                organizations.map((orgItem) => {
                  const isSelected = activeOrganization?._id === orgItem.organization._id;
                  return (
                    <button
                      key={orgItem.organization._id}
                      onClick={() => {
                        switchOrganization(orgItem.organization._id);
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-brand-600" />
                        <div>
                          <p className="font-semibold text-slate-800">{orgItem.organization.name}</p>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {orgItem.role}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                    </button>
                  );
                })
              )}

              <div className="my-1 border-t border-slate-100" />

              {/* Create New Org Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Organization</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Create Organization Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Organization"
        description="Establish a collaborative enterprise workspace with team members, roles, and shared knowledge bases."
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <Input
            label="Organization Name *"
            placeholder="e.g. Acme Corporation"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Workspace URL Slug (Optional)"
            placeholder="e.g. acme-corp"
            value={newOrgSlug}
            onChange={(e) => setNewOrgSlug(e.target.value)}
            helperText="Lowercase alphanumeric characters and hyphens only."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
