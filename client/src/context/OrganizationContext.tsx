import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IOrganization, OrgRole } from '../types/organization';
import { organizationService } from '../services/organizationService';
import { useAuth } from './AuthContext';

export const ACTIVE_ORG_STORAGE_KEY = 'vaultiq_active_org_id';

interface OrganizationContextType {
  organizations: Array<{ organization: IOrganization; role: OrgRole }>;
  activeOrganization: IOrganization | null;
  activeRole: OrgRole | null;
  isLoading: boolean;
  switchOrganization: (orgId: string | null) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [organizations, setOrganizations] = useState<Array<{ organization: IOrganization; role: OrgRole }>>([]);
  const [activeOrganization, setActiveOrganization] = useState<IOrganization | null>(null);
  const [activeRole, setActiveRole] = useState<OrgRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setActiveOrganization(null);
      setActiveRole(null);
      return;
    }

    try {
      setIsLoading(true);
      const orgList = await organizationService.listUserOrganizations();
      setOrganizations(orgList);

      const savedOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
      if (savedOrgId) {
        const found = orgList.find((o) => o.organization._id === savedOrgId);
        if (found) {
          setActiveOrganization(found.organization);
          setActiveRole(found.role);
        } else {
          // If saved org is no longer accessible, reset to personal
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
          setActiveOrganization(null);
          setActiveRole(null);
        }
      }
    } catch (err) {
      console.error('Failed to load user organizations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshOrganizations();
  }, [refreshOrganizations]);

  const switchOrganization = (orgId: string | null) => {
    if (!orgId) {
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      setActiveOrganization(null);
      setActiveRole(null);
      window.location.reload();
      return;
    }

    const match = organizations.find((o) => o.organization._id === orgId);
    if (match) {
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
      setActiveOrganization(match.organization);
      setActiveRole(match.role);
      window.location.reload();
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrganization,
        activeRole,
        isLoading,
        switchOrganization,
        refreshOrganizations
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
