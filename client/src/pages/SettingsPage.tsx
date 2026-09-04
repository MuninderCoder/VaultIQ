import React, { useState } from 'react';
import { User, Shield, Palette, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');

  // Password fields for UI foundation
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your enterprise profile, security credentials, and platform preferences.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Information
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Security & Password
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'preferences'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          Preferences
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              Authenticated identity information verified by the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <div>
              <Input
                label="Full Name"
                value={user?.name || ''}
                readOnly
                disabled
                helperText="Name registered with your corporate identity"
              />
            </div>

            <div>
              <Input
                label="Email Address"
                value={user?.email || ''}
                readOnly
                disabled
                helperText="Primary email used for JWT authentication and session tokens"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Organizational Role
              </label>
              <div className="flex items-center gap-2">
                <Badge variant="default" size="md">
                  {user?.role || 'USER'}
                </Badge>
                <span className="text-xs text-slate-500">
                  {user?.role === 'ADMIN'
                    ? 'Full platform administrative access'
                    : 'Standard enterprise knowledge worker'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Identifier
              </label>
              <p className="font-mono text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 truncate">
                {user?.id || '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security & Password Management</CardTitle>
            <CardDescription>
              Password update credentials foundation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Foundation Notice:</strong> Password reset and email verification workflows are slated for Phase 6. No mock save operations are executed to prevent false security guarantees.
              </span>
            </div>

            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled
            />
          </CardContent>
          <CardFooter>
            <Button variant="primary" disabled>
              Update Password (Phase 6)
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Tab: Preferences */}
      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Preferences</CardTitle>
            <CardDescription>
              User interface and notification settings foundation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 max-w-xl">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Interface Theme</p>
                <p className="text-xs text-slate-500">Currently locked to Enterprise Slate Clean</p>
              </div>
              <Badge variant="default">Light (Default)</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-800">Audit Notifications</p>
                <p className="text-xs text-slate-500">Security event notifications via email</p>
              </div>
              <Badge variant="default">Phase 6</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
