import { api } from './api';
import { ApiResponse } from '../types';
import { SearchResponseData } from '../types/document';

export const searchService = {
  /**
   * Performs semantic vector search across organizational document chunks (Phase 4)
   * @param query Search query string
   * @param limit Maximum results (1-50, default 10)
   */
  async searchSemantic(query: string, limit: number = 10): Promise<ApiResponse<SearchResponseData>> {
    const params = new URLSearchParams();
    params.append('q', query.trim());
    if (limit) {
      params.append('limit', limit.toString());
    }

    const response = await api.get<ApiResponse<SearchResponseData>>(`/search?${params.toString()}`);
    return response.data;
  }
};
