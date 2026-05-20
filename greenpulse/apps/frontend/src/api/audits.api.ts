// =============================================================
// GREENPULSE — Audits API
// =============================================================

import { apiClient } from './client';
import {
  Audit,
  AuditStatus,
  ScanCategory,
  Finding,
  AiRecommendation,
  ScanResult,
  PaginatedResponse,
} from '../types';

export interface CreateAuditDto {
  name: string;
  projectId: string;
  scanCategories: ScanCategory[];
  targetUrl?: string;
}

export interface ListAuditsParams {
  page?: number;
  limit?: number;
  projectId?: string;
  status?: AuditStatus;
}

export interface AuditResultsResponse {
  findings: Finding[];
  recommendations: AiRecommendation[];
  scanResults: ScanResult[];
}

export const auditsApi = {
  async list(params?: ListAuditsParams): Promise<PaginatedResponse<Audit>> {
    const { data } = await apiClient.get<PaginatedResponse<Audit>>('/api/audits', { params });
    return data;
  },

  async create(dto: CreateAuditDto): Promise<Audit> {
    const { data } = await apiClient.post<Audit>('/api/audits', dto);
    return data;
  },

  async get(id: string): Promise<Audit> {
    const { data } = await apiClient.get<Audit>(`/api/audits/${id}`);
    return data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/audits/${id}`);
  },

  async run(id: string): Promise<{ started: boolean }> {
    const { data } = await apiClient.post<{ started: boolean }>(`/api/audits/${id}/run`);
    return data;
  },

  async stop(id: string): Promise<void> {
    await apiClient.post(`/api/audits/${id}/stop`);
  },

  async getResults(id: string): Promise<AuditResultsResponse> {
    const { data } = await apiClient.get<AuditResultsResponse>(`/api/audits/${id}/results`);
    return data;
  },

  getStatusStream(id: string): EventSource {
    const token = (() => {
      try {
        const raw = localStorage.getItem('greenpulse-auth');
        if (!raw) return null;
        const state = JSON.parse(raw);
        return state?.state?.tokens?.accessToken ?? null;
      } catch {
        return null;
      }
    })();

    const baseUrl = import.meta.env.VITE_API_URL ?? window.location.origin;
    const url = new URL(`${baseUrl}/api/audits/${id}/status`);
    if (token) {
      url.searchParams.set('token', token);
    }

    return new EventSource(url.toString());
  },
};
