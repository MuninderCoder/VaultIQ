import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white text-slate-400 border border-slate-200 shadow-sm flex items-center justify-center mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <h2 className="text-lg font-semibold text-slate-800 mt-1">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
        The resource or route you requested does not exist in the VaultIQ platform.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/dashboard')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Back to Dashboard
      </Button>
    </div>
  );
};
