import { api } from './api';
import { ApiResponse, AuthResponseData, User } from '../types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> {
    const response = await api.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    return response.data;
  },

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  }
};
