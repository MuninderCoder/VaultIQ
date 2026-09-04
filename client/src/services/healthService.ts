import { api } from './api';
import { ApiResponse, HealthData } from '../types';

export const checkHealth = async (): Promise<ApiResponse<HealthData>> => {
  const response = await api.get<ApiResponse<HealthData>>('/health');
  return response.data;
};
