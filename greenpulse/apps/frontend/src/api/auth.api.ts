// =============================================================
// GREENPULSE — Auth API
// =============================================================

import { apiClient } from './client';
import { User } from '../types';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/login', dto);
    return data;
  },

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/register', dto);
    return data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await apiClient.post<RefreshResponse>('/api/auth/refresh', { refreshToken });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/auth/me');
    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },
};
