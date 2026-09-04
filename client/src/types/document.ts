export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface DocumentContent {
  text: string;
  characterCount: number;
  wordCount: number;
  pageCount?: number;
  metadata?: Record<string, any>;
  processedAt: string;
  processingVersion: string;
}

export interface DocumentItem {
  _id: string;
  owner: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  extension: string;
  size: number;
  storagePath: string;
  status: DocumentStatus;
  processingError?: string | null;
  metadata: DocumentMetadata;
  content?: DocumentContent;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface DocumentListResponseData {
  documents: DocumentItem[];
  pagination: DocumentPagination;
}

export interface DocumentStats {
  totalDocuments: number;
  totalStorageUsed: number;
  processedCount: number;
  processingCount: number;
  failedCount: number;
  uploadedCount: number;
  recentDocuments: Array<{
    id: string;
    originalName: string;
    extension: string;
    size: number;
    status: DocumentStatus;
    uploadedAt: string;
  }>;
  byExtension: Record<string, number>;
}

export interface DocumentUploadInput {
  title?: string;
  description?: string;
  tags?: string;
}

export interface ProcessingStatusResponse {
  id: string;
  status: DocumentStatus;
  processingError?: string | null;
  characterCount?: number;
  wordCount?: number;
  pageCount?: number;
  processedAt?: string;
}

export interface DocumentContentResponse {
  id: string;
  originalName: string;
  status: DocumentStatus;
  content: DocumentContent;
}
