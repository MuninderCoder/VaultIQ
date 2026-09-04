import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Files,
  Upload,
  Search,
  Filter,
  FileText,
  FileCode,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { documentService } from '../services/documentService';
import { DocumentItem, DocumentPagination, DocumentStatus } from '../types/document';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const DocumentsPage: React.FC = () => {
  // Document state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pagination, setPagination] = useState<DocumentPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Details modal state
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Delete modal state
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch documents from server
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentService.getDocuments({
        page: currentPage,
        limit: 10,
        search: searchQuery,
        status: activeStatus
      });

      if (response.success && response.data) {
        setDocuments(response.data.documents);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to retrieve documents. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, activeStatus]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle search with reset to page 1
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDocuments();
  };

  const handleStatusChange = (status: string) => {
    setActiveStatus(status);
    setCurrentPage(1);
  };

  // Upload handlers
  const handleFileSelect = (file: File) => {
    setUploadError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(
        `Unsupported file type '${ext}'. Please upload a PDF, DOCX, TXT, or Markdown document.`
      );
      return;
    }

    if (file.size === 0) {
      setUploadError('Selected file is empty (0 bytes).');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File exceeds the maximum allowed size of ${MAX_SIZE_MB} MB.`);
      return;
    }

    setSelectedFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please choose a document to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await documentService.uploadDocument(
        selectedFile,
        {
          title: uploadTitle.trim() || undefined,
          description: uploadDescription.trim() || undefined,
          tags: uploadTags.trim() || undefined
        },
        (percent) => {
          setUploadProgress(percent);
        }
      );

      // Reset modal and refresh documents
      setIsUploadModalOpen(false);
      resetUploadForm();
      setCurrentPage(1);
      fetchDocuments();
    } catch (err: any) {
      setUploadError(
        err.response?.data?.message || err.message || 'Upload failed. Please check the file.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadTags('');
    setUploadProgress(0);
    setUploadError(null);
  };

  // Download handler
  const handleDownload = async (doc: DocumentItem) => {
    try {
      await documentService.downloadDocument(doc._id, doc.originalName);
    } catch {
      alert('Failed to download document. Please try again.');
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    setIsDeleting(true);
    try {
      await documentService.deleteDocumentById(documentToDelete._id);
      setDocumentToDelete(null);
      if (selectedDocument?._id === documentToDelete._id) {
        setIsDetailsModalOpen(false);
        setSelectedDocument(null);
      }
      fetchDocuments();
    } catch {
      alert('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Utility to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusBadgeVariant = (
    status: DocumentStatus
  ): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'UPLOADED':
        return 'info';
      case 'PROCESSED':
        return 'success';
      case 'PROCESSING':
        return 'warning';
      case 'FAILED':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getFileIcon = (ext: string) => {
    switch (ext.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'txt':
        return <FileText className="w-5 h-5 text-slate-500" />;
      case 'md':
        return <FileCode className="w-5 h-5 text-emerald-500" />;
      default:
        return <Files className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Documents
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and organize your knowledge base with secure encrypted storage.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetUploadForm();
            setIsUploadModalOpen(true);
          }}
          leftIcon={<Upload className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      {/* 2. Search & Status Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="w-full md:max-w-md flex gap-2">
          <Input
            placeholder="Search by name, title, description, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {(['ALL', 'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeStatus === status
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Document Content Area */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Repository Assets
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {pagination.total} {pagination.total === 1 ? 'document' : 'documents'} found
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" color="brand" />
            <p className="text-xs text-slate-400 font-medium mt-3">Loading documents...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-8">
            <ErrorState
              title="Unable to load documents"
              message={error}
              onRetry={fetchDocuments}
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && documents.length === 0 && (
          <div className="p-12">
            <EmptyState
              icon={<Files className="w-8 h-8 text-slate-400" />}
              title={searchQuery || activeStatus !== 'ALL' ? 'No matching documents' : 'No documents uploaded yet'}
              description={
                searchQuery || activeStatus !== 'ALL'
                  ? 'No documents matched your current search or filter criteria. Try resetting filters.'
                  : 'Your repository is empty. Upload your first PDF, DOCX, TXT, or Markdown file to get started.'
              }
              badgeText={searchQuery || activeStatus !== 'ALL' ? 'Filtered' : 'Phase 2 Storage Active'}
              action={
                searchQuery || activeStatus !== 'ALL' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveStatus('ALL');
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      resetUploadForm();
                      setIsUploadModalOpen(true);
                    }}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Upload Document
                  </Button>
                )
              }
            />
          </div>
        )}

        {/* Documents Table */}
        {!isLoading && !error && documents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Name</th>
                  <th scope="col" className="px-4 py-3.5">Type</th>
                  <th scope="col" className="px-4 py-3.5">Size</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Uploaded</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Title */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 flex-shrink-0">
                          {getFileIcon(doc.extension)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-xs sm:max-w-md">
                            {doc.metadata?.title || doc.originalName}
                          </p>
                          {doc.metadata?.title && (
                            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                              {doc.originalName}
                            </p>
                          )}
                          {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {doc.metadata.tags.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded"
                                >
                                  #{t}
                                </span>
                              ))}
                              {doc.metadata.tags.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{doc.metadata.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* File Type */}
                    <td className="px-4 py-4 uppercase font-semibold text-xs text-slate-500">
                      {doc.extension}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {formatBytes(doc.size)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(doc.status)} size="sm">
                        {doc.status}
                      </Badge>
                    </td>

                    {/* Upload Date */}
                    <td className="px-4 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          title="View Details"
                          aria-label={`View details of ${doc.originalName}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition-colors"
                          title="Download Document"
                          aria-label={`Download ${doc.originalName}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDocumentToDelete(doc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Document"
                          aria-label={`Delete ${doc.originalName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Server-Side Pagination Controls */}
        {!isLoading && !error && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrevPage}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => setCurrentPage((p) => p + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Upload Modal with Drag-and-Drop & Real Progress */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!isUploading) {
            setIsUploadModalOpen(false);
            resetUploadForm();
          }
        }}
        title="Upload Document"
        description="Select a document to store securely in the enterprise repository."
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-brand-500 bg-brand-50/50'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="p-3 rounded-xl bg-white shadow-xs border border-slate-200 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(selectedFile.size)} • Click or drag to replace
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  Drag & drop your document here, or browse
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: PDF, DOCX, TXT, MD • Max size: 25 MB
                </p>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="space-y-3 pt-2">
            <Input
              label="Document Title (Optional)"
              placeholder="e.g. Employee Compensation Guideline 2026"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              disabled={isUploading}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Brief summary of document contents..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                disabled={isUploading}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <Input
              label="Tags (Optional, comma-separated)"
              placeholder="e.g. hr, policy, compensation"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              disabled={isUploading}
              helperText="Enables fast multi-tag search filtering"
            />
          </div>

          {/* Real Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Uploading to secure storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all duration-150 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              disabled={isUploading}
              onClick={() => {
                setIsUploadModalOpen(false);
                resetUploadForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedFile || isUploading}
              isLoading={isUploading}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Document Details Modal */}
      {/* ========================================================================= */}
      {selectedDocument && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={selectedDocument.metadata?.title || selectedDocument.originalName}
          description="Document Metadata and Security Details"
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDocumentToDelete(selectedDocument);
                }}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDownload(selectedDocument)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download File
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Filename</span>
                <span className="text-slate-800 font-medium break-all mt-0.5 block">
                  {selectedDocument.originalName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">File Format</span>
                <span className="text-slate-800 font-medium uppercase mt-0.5 block">
                  {selectedDocument.extension} ({selectedDocument.mimeType})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Size</span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {formatBytes(selectedDocument.size)} ({selectedDocument.size.toLocaleString()} bytes)
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Status</span>
                <Badge variant={getStatusBadgeVariant(selectedDocument.status)} size="sm">
                  {selectedDocument.status}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Uploaded Date</span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  {new Date(selectedDocument.uploadedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Storage Identifier</span>
                <span className="text-slate-600 font-mono text-[11px] truncate mt-0.5 block">
                  {selectedDocument.storedName}
                </span>
              </div>
            </div>

            {selectedDocument.metadata?.description && (
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Description</span>
                <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedDocument.metadata.description}
                </p>
              </div>
            )}

            {selectedDocument.metadata?.tags && selectedDocument.metadata.tags.length > 0 && (
              <div>
                <span className="text-slate-500 font-semibold block mb-1.5">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDocument.metadata.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 text-[11px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Delete Confirmation Modal */}
      {/* ========================================================================= */}
      {documentToDelete && (
        <Modal
          isOpen={true}
          onClose={() => !isDeleting && setDocumentToDelete(null)}
          title="Delete Document"
          description="Are you sure you want to permanently delete this document?"
          maxWidth="sm"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDocumentToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
              >
                Permanently Delete
              </Button>
            </>
          }
        >
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              This will remove the document metadata from the database and permanently delete the physical file:{' '}
              <strong className="text-slate-900 break-all">{documentToDelete.originalName}</strong>
            </p>
            <p className="text-xs text-rose-600 font-medium">
              This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
