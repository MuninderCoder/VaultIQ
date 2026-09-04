import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const TOKEN_STORAGE_KEY = 'vaultiq_auth_token';
export const ACTIVE_ORG_STORAGE_KEY = 'vaultiq_active_org_id';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request Interceptor: Attach JWT Bearer Token and x-organization-id
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeOrgId = localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    if (activeOrgId && config.headers) {
      config.headers['x-organization-id'] = activeOrgId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle unauthenticated responses globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('vaultiq:unauthorized'));
    }
    return Promise.reject(error);
  }
);
