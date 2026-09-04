export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface DocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
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
  metadata: DocumentMetadata;
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
