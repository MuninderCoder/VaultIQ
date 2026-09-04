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
  X,
  Play,
  RotateCw,
  BookOpen,
  Database,
  Sparkles
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
import { cn } from '../utils/cn';

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
  const [uploadVisibility, setUploadVisibility] = useState<'ORGANIZATION' | 'PRIVATE'>('ORGANIZATION');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Details modal state
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Content viewer modal state (Phase 3)
  const [viewingContentDoc, setViewingContentDoc] = useState<DocumentItem | null>(null);
  const [documentContent, setDocumentContent] = useState<any | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // Processing & Indexing state
  const [processingDocIds, setProcessingDocIds] = useState<Record<string, boolean>>({});
  const [indexingDocIds, setIndexingDocIds] = useState<Record<string, boolean>>({});

  // Delete modal state
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch documents from server
  const fetchDocuments = useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
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
      if (!silent) {
        setError(
          err.response?.data?.message || 'Failed to retrieve documents. Please try again.'
        );
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [currentPage, searchQuery, activeStatus]);

  // Polling effect: poll every 2 seconds when any document is in PROCESSING or INDEXING state
  useEffect(() => {
    const hasActiveTask = documents.some(
      (doc) => doc.status === 'PROCESSING' || doc.indexingStatus === 'INDEXING'
    );
    if (!hasActiveTask) return;

    const interval = setInterval(() => {
      fetchDocuments(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

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
          tags: uploadTags.trim() || undefined,
          visibility: uploadVisibility
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
    setUploadVisibility('ORGANIZATION');
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

  // Phase 3: Trigger document processing
  const handleProcessDocument = async (doc: DocumentItem) => {
    setProcessingDocIds((prev) => ({ ...prev, [doc._id]: true }));
    try {
      await documentService.processDocument(doc._id);
      fetchDocuments(true);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to trigger document processing');
      fetchDocuments(true);
    } finally {
      setProcessingDocIds((prev) => ({ ...prev, [doc._id]: false }));
    }
  };

  // Phase 4: Trigger vector embedding indexing
  const handleIndexDocument = async (doc: DocumentItem) => {
    setIndexingDocIds((prev) => ({ ...prev, [doc._id]: true }));
    try {
      await documentService.indexDocument(doc._id);
      fetchDocuments(true);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to trigger document indexing');
      fetchDocuments(true);
    } finally {
      setIndexingDocIds((prev) => ({ ...prev, [doc._id]: false }));
    }
  };

  // Phase 3: Open extracted content viewer modal
  const handleOpenContentViewer = async (doc: DocumentItem) => {
    setViewingContentDoc(doc);
    setDocumentContent(null);
    setIsLoadingContent(true);
    setContentError(null);

    try {
      const response = await documentService.getDocumentContent(doc._id);
      if (response.success && response.data) {
        setDocumentContent(response.data.content);
      }
    } catch (err: any) {
      setContentError(
        err.response?.data?.message || 'Failed to load document content. Please try again.'
      );
    } finally {
      setIsLoadingContent(false);
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

  const getIndexingBadgeVariant = (
    status: string
  ): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'INDEXED':
        return 'success';
      case 'INDEXING':
        return 'warning';
      case 'INDEX_FAILED':
        return 'danger';
      case 'NOT_INDEXED':
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
                  <th scope="col" className="px-4 py-3.5">Visibility</th>
                  <th scope="col" className="px-4 py-3.5">Size</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Indexing</th>
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

                    {/* Visibility Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          doc.visibility === 'PRIVATE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        )}
                      >
                        {doc.visibility === 'PRIVATE' ? 'Private' : 'Organization'}
                      </span>
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

                    {/* Indexing Status Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={getIndexingBadgeVariant(doc.indexingStatus || 'NOT_INDEXED')} size="sm">
                          {doc.indexingStatus || 'NOT_INDEXED'}
                        </Badge>
                        {doc.indexingStatus === 'INDEXED' && doc.chunkCount !== undefined && (
                          <span className="text-[11px] font-mono text-slate-400">
                            ({doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'})
                          </span>
                        )}
                      </div>
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
                        {/* Process / Re-process Button */}
                        {(doc.status === 'UPLOADED' || doc.status === 'FAILED') && (
                          <button
                            onClick={() => handleProcessDocument(doc)}
                            disabled={processingDocIds[doc._id]}
                            className={`p-1.5 rounded-lg transition-colors ${
                              doc.status === 'FAILED'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-brand-600 hover:bg-brand-50'
                            }`}
                            title={doc.status === 'FAILED' ? 'Retry Processing' : 'Process Document'}
                            aria-label={`${doc.status === 'FAILED' ? 'Retry' : 'Process'} ${doc.originalName}`}
                          >
                            {processingDocIds[doc._id] ? (
                              <RotateCw className="w-4 h-4 animate-spin text-brand-600" />
                            ) : doc.status === 'FAILED' ? (
                              <RotateCw className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Processing Spinner */}
                        {doc.status === 'PROCESSING' && (
                          <span
                            className="p-1.5 inline-flex items-center text-amber-500"
                            title="Currently processing..."
                          >
                            <RotateCw className="w-4 h-4 animate-spin" />
                          </span>
                        )}

                        {/* View Extracted Content Button */}
                        {doc.status === 'PROCESSED' && (
                          <button
                            onClick={() => handleOpenContentViewer(doc)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="View Extracted Content"
                            aria-label={`View extracted content of ${doc.originalName}`}
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}

                        {/* Phase 4: Vector Index Button */}
                        {doc.status === 'PROCESSED' && (
                          <>
                            {/* Index / Re-index Button */}
                            {(doc.indexingStatus === 'NOT_INDEXED' || doc.indexingStatus === 'INDEX_FAILED') && (
                              <button
                                onClick={() => handleIndexDocument(doc)}
                                disabled={indexingDocIds[doc._id]}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  doc.indexingStatus === 'INDEX_FAILED'
                                    ? 'text-rose-600 hover:bg-rose-50'
                                    : 'text-indigo-600 hover:bg-indigo-50'
                                }`}
                                title={doc.indexingStatus === 'INDEX_FAILED' ? 'Retry Vector Indexing' : 'Index for Semantic Search'}
                                aria-label={`${doc.indexingStatus === 'INDEX_FAILED' ? 'Retry Index' : 'Index'} ${doc.originalName}`}
                              >
                                {indexingDocIds[doc._id] ? (
                                  <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                                ) : (
                                  <Sparkles className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Indexing Spinner */}
                            {doc.indexingStatus === 'INDEXING' && (
                              <span
                                className="p-1.5 inline-flex items-center text-indigo-500"
                                title="Generating vector embeddings..."
                              >
                                <RotateCw className="w-4 h-4 animate-spin" />
                              </span>
                            )}

                            {/* Re-index already indexed doc */}
                            {doc.indexingStatus === 'INDEXED' && (
                              <button
                                onClick={() => handleIndexDocument(doc)}
                                disabled={indexingDocIds[doc._id]}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Re-index Chunks"
                                aria-label={`Re-index ${doc.originalName}`}
                              >
                                {indexingDocIds[doc._id] ? (
                                  <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                                ) : (
                                  <Database className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Access Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUploadVisibility('ORGANIZATION')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    uploadVisibility === 'ORGANIZATION'
                      ? 'border-brand-500 bg-brand-50/60 text-brand-900 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-slate-800">Organization</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Shared with workspace members</p>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadVisibility('PRIVATE')}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    uploadVisibility === 'PRIVATE'
                      ? 'border-brand-500 bg-brand-50/60 text-brand-900 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-slate-800">Private</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Strictly visible to you only</p>
                </button>
              </div>
            </div>
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

            {/* Extraction error if FAILED */}
            {selectedDocument.status === 'FAILED' && selectedDocument.processingError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                <span className="font-semibold block mb-0.5">Extraction Failed</span>
                <p className="text-xs text-rose-700">{selectedDocument.processingError}</p>
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleProcessDocument(selectedDocument);
                    }}
                    leftIcon={<RotateCw className="w-3.5 h-3.5" />}
                  >
                    Retry Extraction
                  </Button>
                </div>
              </div>
            )}

            {/* Extracted content summary if PROCESSED */}
            {selectedDocument.status === 'PROCESSED' && selectedDocument.content && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Extracted Text Metrics
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenContentViewer(selectedDocument);
                    }}
                    leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                  >
                    View Full Text
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-emerald-800">
                  <div>
                    <span className="text-emerald-600 text-[10px] uppercase font-semibold block">Characters</span>
                    <span className="font-bold">{selectedDocument.content.characterCount?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-emerald-600 text-[10px] uppercase font-semibold block">Words</span>
                    <span className="font-bold">{selectedDocument.content.wordCount?.toLocaleString() || 0}</span>
                  </div>
                  {selectedDocument.content.pageCount !== undefined && (
                    <div>
                      <span className="text-emerald-600 text-[10px] uppercase font-semibold block">Pages</span>
                      <span className="font-bold">{selectedDocument.content.pageCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phase 4: Vector Indexing Status */}
            {selectedDocument.status === 'PROCESSED' && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Semantic Vector Index
                  </span>
                  <Badge variant={getIndexingBadgeVariant(selectedDocument.indexingStatus || 'NOT_INDEXED')} size="sm">
                    {selectedDocument.indexingStatus || 'NOT_INDEXED'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Vector Chunks</span>
                    <span className="font-bold text-slate-700">{selectedDocument.chunkCount || 0} chunks</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Indexed At</span>
                    <span className="text-slate-700">
                      {selectedDocument.indexedAt ? new Date(selectedDocument.indexedAt).toLocaleString() : 'Not indexed'}
                    </span>
                  </div>
                </div>

                {selectedDocument.indexingError && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs mt-2">
                    <span className="font-semibold block">Indexing Error:</span>
                    <span>{selectedDocument.indexingError}</span>
                  </div>
                )}

                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleIndexDocument(selectedDocument);
                    }}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                  >
                    {selectedDocument.indexingStatus === 'INDEXED'
                      ? 'Re-index Vector Chunks'
                      : selectedDocument.indexingStatus === 'INDEX_FAILED'
                      ? 'Retry Vector Indexing'
                      : 'Index for Vector Search'}
                  </Button>
                </div>
              </div>
            )}

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

      {/* ========================================================================= */}
      {/* MODAL 4: Extracted Content Viewer Modal (Phase 3) */}
      {/* ========================================================================= */}
      {viewingContentDoc && (
        <Modal
          isOpen={true}
          onClose={() => {
            setViewingContentDoc(null);
            setDocumentContent(null);
            setContentError(null);
          }}
          title={`Extracted Content: ${viewingContentDoc.metadata?.title || viewingContentDoc.originalName}`}
          description="Normalized document text extracted by the Phase 3 pipeline"
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400 font-medium">
                {documentContent
                  ? `${documentContent.characterCount?.toLocaleString()} chars • ${documentContent.wordCount?.toLocaleString()} words${
                      documentContent.pageCount ? ` • ${documentContent.pageCount} pages` : ''
                    }`
                  : ''}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setViewingContentDoc(null);
                  setDocumentContent(null);
                  setContentError(null);
                }}
              >
                Close
              </Button>
            </div>
          }
        >
          {isLoadingContent && (
            <div className="py-12 flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" color="brand" />
              <p className="text-xs text-slate-400 mt-2 font-medium">Loading extracted text...</p>
            </div>
          )}

          {!isLoadingContent && contentError && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-semibold mb-1">Failed to load extracted content</p>
              <p>{contentError}</p>
            </div>
          )}

          {!isLoadingContent && !contentError && documentContent && (
            <div className="space-y-4">
              {/* Extraction Metadata Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Characters</span>
                  <span className="font-bold text-slate-800">{documentContent.characterCount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Words</span>
                  <span className="font-bold text-slate-800">{documentContent.wordCount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Pages</span>
                  <span className="font-bold text-slate-800">{documentContent.pageCount !== undefined ? documentContent.pageCount : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Processed At</span>
                  <span className="font-medium text-slate-700">
                    {documentContent.processedAt ? new Date(documentContent.processedAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Text Body with Paragraph Separation */}
              <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
                {documentContent.text || 'No text extracted.'}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
