import React, { useState, useEffect } from 'react';
import { Shield, Filter, Code, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { organizationService } from '../services/organizationService';
import { IAuditLog } from '../types/organization';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const AuditLogsPage: React.FC = () => {
  const { activeOrganization, activeRole } = useOrganization();
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [activeMetadata, setActiveMetadata] = useState<Record<string, any> | null>(null);

  const fetchLogs = async () => {
    if (!activeOrganization) return;
    try {
      setIsLoading(true);
      const data = await organizationService.getAuditLogs(activeOrganization._id, {
        page,
        limit: 20,
        action: selectedAction || undefined
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeOrganization, page, selectedAction]);

  if (!activeOrganization) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">No Organization Selected</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Select an organization in the top bar to inspect compliance and security audit trails.
          </p>
        </Card>
      </div>
    );
  }

  if (activeRole !== 'OWNER' && activeRole !== 'ADMIN') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="p-8 text-center bg-rose-50/50 border-rose-100">
          <Shield className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-rose-900">Access Restricted</h2>
          <p className="text-sm text-rose-700 mt-1 max-w-md mx-auto">
            Audit logs contain sensitive security and compliance telemetry. Access is strictly restricted to Workspace OWNERs and ADMINs.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Security Audit Logs
            </h1>
            <Badge variant="info">{total} Records</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, append-only security telemetry for {activeOrganization.name}.
          </p>
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Security Actions</option>
            <option value="ORGANIZATION_CREATED">ORGANIZATION_CREATED</option>
            <option value="ORGANIZATION_UPDATED">ORGANIZATION_UPDATED</option>
            <option value="MEMBER_INVITED">MEMBER_INVITED</option>
            <option value="MEMBER_ROLE_CHANGED">MEMBER_ROLE_CHANGED</option>
            <option value="MEMBER_REMOVED">MEMBER_REMOVED</option>
            <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
            <option value="DOCUMENT_VIEWED">DOCUMENT_VIEWED</option>
            <option value="DOCUMENT_INDEXED">DOCUMENT_INDEXED</option>
            <option value="DOCUMENT_DELETED">DOCUMENT_DELETED</option>
            <option value="CONVERSATION_CREATED">CONVERSATION_CREATED</option>
            <option value="MESSAGE_SENT">MESSAGE_SENT</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading security audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                          {log.actorId?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {log.actorId?.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {log.actorId?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{log.resourceType}</span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                        {log.resourceId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <button
                          onClick={() => setActiveMetadata(log.metadata)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Code className="w-3.5 h-3.5 text-slate-400" />
                          <span>Payload</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Metadata Viewer Modal */}
      <Modal
        isOpen={!!activeMetadata}
        onClose={() => setActiveMetadata(null)}
        title="Audit Event Metadata"
        description="Sanitized telemetry payload captured at the time of action."
      >
        <div className="rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[400px]">
          <pre>{JSON.stringify(activeMetadata, null, 2)}</pre>
        </div>
      </Modal>
    </div>
  );
};
