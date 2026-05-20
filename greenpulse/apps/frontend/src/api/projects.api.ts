// =============================================================
// GREENPULSE — Projects API
// =============================================================

import { apiClient } from './client';
import { Project, PaginatedResponse } from '../types';

export interface CreateProjectDto {
  name: string;
  description?: string;
  url?: string;
  environment?: 'production' | 'staging' | 'dev';
  tags?: string[];
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  isActive?: boolean;
}

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

export const projectsApi = {
  async list(params?: ListProjectsParams): Promise<PaginatedResponse<Project>> {
    const { data } = await apiClient.get<PaginatedResponse<Project>>('/api/projects', { params });
    return data;
  },

  async create(dto: CreateProjectDto): Promise<Project> {
    const { data } = await apiClient.post<Project>('/api/projects', dto);
    return data;
  },

  async get(id: string): Promise<Project> {
    const { data } = await apiClient.get<Project>(`/api/projects/${id}`);
    return data;
  },

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const { data } = await apiClient.patch<Project>(`/api/projects/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/projects/${id}`);
  },
};
