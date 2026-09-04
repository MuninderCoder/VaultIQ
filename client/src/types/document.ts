export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
export type IndexingStatus = 'NOT_INDEXED' | 'INDEXING' | 'INDEXED' | 'INDEX_FAILED';

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
  indexingStatus: IndexingStatus;
  indexingError?: string | null;
  indexedAt?: string | null;
  chunkCount: number;
  organizationId?: string;
  visibility?: 'PRIVATE' | 'ORGANIZATION';
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
  indexedCount: number;
  notIndexedCount: number;
  indexingCount: number;
  indexFailedCount: number;
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
  visibility?: 'PRIVATE' | 'ORGANIZATION';
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

export interface IndexingStatusResponse {
  id: string;
  status: IndexingStatus;
  chunkCount: number;
  indexedAt?: string | null;
  embeddingModel?: string;
  embeddingDimensions?: number;
  indexingError?: string | null;
}

export interface SearchResultItem {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  score: number;
  characterCount: number;
  wordCount: number;
}

export interface SearchResponseData {
  query: string;
  count: number;
  results: SearchResultItem[];
}
