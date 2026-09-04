import React, { useState, useEffect } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkHealth } from '../services/healthService';
import { Badge } from './Badge';
import { OrganizationSwitcher } from './OrganizationSwitcher';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const pollHealth = async () => {
      try {
        const res = await checkHealth();
        if (isMounted) {
          setIsHealthy(res.success && res.data?.status === 'operational');
        }
      } catch {
        if (isMounted) setIsHealthy(false);
      }
    };

    pollHealth();
    const interval = setInterval(pollHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile sidebar toggle + Platform Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Toggle navigation"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm font-bold tracking-wider text-base">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-slate-900 text-lg leading-tight">
                  VAULTIQ
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                  v1.0
                </span>
              </div>
              <span className="hidden sm:block text-[11px] text-slate-500 leading-none">
                Intelligent Enterprise Knowledge Platform
              </span>
            </div>
          </div>
        </div>

        {/* Right: Organization Switcher, System Status & User Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Active Workspace / Organization Selector */}
          <OrganizationSwitcher />

          {/* Live System Health Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy === true
                  ? 'bg-emerald-500 animate-pulse'
                  : isHealthy === false
                  ? 'bg-rose-500'
                  : 'bg-slate-300'
              }`}
            />
            <span className="text-slate-600 font-medium">
              API {isHealthy === true ? 'Operational' : isHealthy === false ? 'Offline' : 'Checking'}
            </span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 leading-tight">
                    {user?.name || 'User'}
                  </span>
                  <Badge variant="default" size="sm">
                    {user?.role || 'USER'}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500 block leading-tight truncate max-w-[140px]">
                  {user?.email || ''}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-lg border border-slate-200 py-1.5 z-50 animate-fade-in"
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Signed in as
                  </p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1">
                  <div className="px-4 py-2 text-xs text-slate-500 flex items-center justify-between">
                    <span>Role</span>
                    <span className="font-semibold text-slate-700">{user?.role}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
