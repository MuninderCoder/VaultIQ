import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  Search,
  MessageSquare,
  Settings,
  Layers
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', href: '/documents', icon: Files },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Knowledge Assistant', href: '/chat', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col justify-between border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* Section Header */}
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </p>
            <nav className="mt-3 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            'w-5 h-5 transition-colors',
                            isActive
                              ? 'text-brand-600'
                              : 'text-slate-400 group-hover:text-slate-600'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-4 rounded-full bg-brand-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Phase 1 Architecture Indicator */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>Phase 1 Architecture</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Production foundation online. Document processing & RAG slated for Phase 2–5.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
