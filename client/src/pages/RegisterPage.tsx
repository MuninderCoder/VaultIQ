import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please check the input requirements.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">Create your account</h3>
        <p className="text-sm text-slate-500 mt-1">
          Join VaultIQ to access secure organizational knowledge.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
          autoComplete="name"
          required
        />

        <Input
          label="Corporate Email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
          required
        />

        {/* Password Strength Guidelines */}
        {password && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <span className={`flex items-center gap-1 ${hasLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> 8+ Characters
              </span>
              <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Uppercase
              </span>
              <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Lowercase
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Number
              </span>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Register Account
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};
