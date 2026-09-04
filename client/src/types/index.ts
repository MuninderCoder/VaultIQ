export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseData {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    details?: string;
    errors?: Array<{ field: string; message: string }>;
  };
}

export interface HealthData {
  service: string;
  status: string;
  environment: string;
  version: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'disconnected';
    readyState: number;
  };
  timestamp: string;
}
