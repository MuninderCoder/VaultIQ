import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo and Brand Header */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md font-bold text-2xl tracking-wider">
            V
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          VAULTIQ
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium tracking-wide uppercase">
          Intelligent Enterprise Knowledge Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 sm:rounded-2xl sm:px-10">
          <Outlet />
        </div>

        {/* Security Assurance Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Enterprise-grade encryption & token-based session management</span>
        </div>
      </div>
    </div>
  );
};
