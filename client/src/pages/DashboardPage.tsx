import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Files,
  Search,
  MessageSquare,
  Upload,
  ArrowUpRight,
  Server,
  Database,
  Clock,
  CheckCircle2,
  FileText,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { checkHealth } from '../services/healthService';
import { documentService } from '../services/documentService';
import { HealthData } from '../types';
import { DocumentStats } from '../types/document';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [docStats, setDocStats] = useState<DocumentStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Fetch system health
    checkHealth()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setHealth(res.data);
        }
      })
      .catch(() => {
        if (isMounted) setHealthError(true);
      });

    // Fetch real document stats
    documentService
      .getDocumentStats()
      .then((res) => {
        if (isMounted && res.success && res.data?.stats) {
          setDocStats(res.data.stats);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingStats(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8">
      {/* 1. Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name || 'Knowledge Worker'}
            </h1>
            <Badge variant="default">{user?.role || 'USER'}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            VaultIQ Enterprise Knowledge Platform • Document Management Online
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/search')}
            leftIcon={<Search className="w-4 h-4" />}
          >
            Search Knowledge
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/documents')}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Manage Documents
          </Button>
        </div>
      </div>

      {/* 2. Platform Metric Cards (Real State Indicators, No Fake Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Documents */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Documents
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Files className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isLoadingStats ? '—' : docStats?.totalDocuments ?? 0}
              </span>
              <span className="ml-2 text-xs text-slate-400">
                {docStats?.totalDocuments === 1 ? 'file' : 'files'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Secure storage active
            </p>
          </CardContent>
        </Card>

        {/* Total Storage Used */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Storage Used
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isLoadingStats ? '—' : formatBytes(docStats?.totalStorageUsed ?? 0)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Max 25 MB / file limit
            </p>
          </CardContent>
        </Card>

        {/* Active Identity */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Identity
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-base font-semibold text-slate-900 truncate block">
                {user?.email}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Role: <span className="font-medium text-slate-700">{user?.role}</span>
            </p>
          </CardContent>
        </Card>

        {/* API Gateway Status */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                API Gateway
              </span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg font-bold text-slate-900">
                {healthError ? 'Degraded' : health?.status === 'operational' ? 'v1 REST Online' : 'Checking'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Uptime: {health?.uptimeSeconds !== undefined ? `${health.uptimeSeconds}s` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/documents')}
            className="group p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Files className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Manage Documents</h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload, filter, download, or inspect enterprise documents.
            </p>
          </div>

          <div
            onClick={() => navigate('/search')}
            className="group p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Enterprise Search</h3>
            <p className="text-xs text-slate-500 mt-1">
              Search across organizational knowledge assets and tags.
            </p>
          </div>

          <div
            onClick={() => navigate('/chat')}
            className="group p-5 rounded-xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Knowledge Assistant</h3>
            <p className="text-xs text-slate-500 mt-1">
              Preview AI citation viewport and conversational thread layout.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Sections: Recently Uploaded Documents & System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Uploaded Documents Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recently Uploaded</CardTitle>
                <CardDescription>Latest knowledge assets stored in your repository</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/documents')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {docStats && docStats.recentDocuments.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {docStats.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => navigate('/documents')}
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {doc.originalName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatBytes(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" size="sm">
                      {doc.extension.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="w-6 h-6 text-slate-400" />}
                title="No documents uploaded yet"
                description="Upload PDF, DOCX, TXT, or Markdown documents to begin building your knowledge repository."
                badgeText="Ready for Upload"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/documents')}
                  >
                    Go to Documents
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* System Activity Section */}
        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>Security events and platform operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="p-1.5 rounded bg-emerald-100 text-emerald-700 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Session Authenticated
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    User {user?.email} signed in via JWT Bearer authentication.
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Active Now</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="p-1.5 rounded bg-indigo-100 text-indigo-700 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Storage Abstraction Ready
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Local storage initialized with path-traversal protection and metadata persistence.
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Storage Online</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="p-1.5 rounded bg-blue-100 text-blue-700 mt-0.5">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    VaultIQ API v1 Initialized
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Document management endpoints mounted at /api/v1/documents.
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">System Event</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
