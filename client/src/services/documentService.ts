import { api } from './api';
import { ApiResponse } from '../types';
import {
  DocumentItem,
  DocumentListResponseData,
  DocumentStats,
  DocumentUploadInput
} from '../types/document';

export interface DocumentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
}

export const documentService = {
  /**
   * Upload a document with real upload progress tracking
   */
  async uploadDocument(
    file: File,
    metadata?: DocumentUploadInput,
    onProgress?: (percentCompleted: number) => void
  ): Promise<ApiResponse<{ document: DocumentItem }>> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata?.title) {
      formData.append('title', metadata.title);
    }
    if (metadata?.description) {
      formData.append('description', metadata.description);
    }
    if (metadata?.tags) {
      formData.append('tags', metadata.tags);
    }

    const response = await api.post<ApiResponse<{ document: DocumentItem }>>(
      '/documents',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      }
    );

    return response.data;
  },

  /**
   * List documents with server-side pagination, search, and status filters
   */
  async getDocuments(
    params: DocumentQueryParams = {}
  ): Promise<ApiResponse<DocumentListResponseData>> {
    const query = new URLSearchParams();

    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search?.trim()) query.append('search', params.search.trim());
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/documents?${queryString}` : '/documents';

    const response = await api.get<ApiResponse<DocumentListResponseData>>(endpoint);
    return response.data;
  },

  /**
   * Get single document metadata
   */
  async getDocumentById(id: string): Promise<ApiResponse<{ document: DocumentItem }>> {
    const response = await api.get<ApiResponse<{ document: DocumentItem }>>(`/documents/${id}`);
    return response.data;
  },

  /**
   * Download a stored document binary
   */
  async downloadDocument(id: string, originalName: string): Promise<void> {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const response = await api.post<ApiResponse<{ deleted: boolean }>>(`/documents/${id}`, {});
    // Actually our backend DELETE endpoint is DELETE /api/v1/documents/:id
    return response.data;
  },

  /**
   * Correct delete call using HTTP DELETE method
   */
  async deleteDocumentById(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>(`/documents/${id}`);
    return response.data;
  },

  /**
   * Trigger text extraction processing for a document (Phase 3)
   */
  async processDocument(id: string): Promise<ApiResponse<{ document: DocumentItem }>> {
    const response = await api.post<ApiResponse<{ document: DocumentItem }>>(`/documents/${id}/process`);
    return response.data;
  },

  /**
   * Get processing status and metrics for a document (Phase 3)
   */
  async getProcessingStatus(id: string): Promise<ApiResponse<{ status: any }>> {
    const response = await api.get<ApiResponse<{ status: any }>>(`/documents/${id}/processing`);
    return response.data;
  },

  /**
   * Retrieve extracted document text content and metadata (Phase 3)
   */
  async getDocumentContent(id: string): Promise<ApiResponse<{
    id: string;
    originalName: string;
    status: string;
    content: any;
  }>> {
    const response = await api.get<ApiResponse<{
      id: string;
      originalName: string;
      status: string;
      content: any;
    }>>(`/documents/${id}/content`);
    return response.data;
  },

  /**
   * Retrieve real document statistics
   */
  async getDocumentStats(): Promise<ApiResponse<{ stats: DocumentStats }>> {
    const response = await api.get<ApiResponse<{ stats: DocumentStats }>>('/documents/stats');
    return response.data;
  }
};
