// =============================================================
// GREENPULSE — Reports API
// =============================================================

import { apiClient } from './client';
import { Report, PaginatedResponse, ReportFormat } from '../types';

export interface GenerateReportDto {
  auditId: string;
  format: ReportFormat;
}

export interface ListReportsParams {
  page?: number;
  limit?: number;
  auditId?: string;
  format?: ReportFormat;
}

export const reportsApi = {
  async list(params?: ListReportsParams): Promise<PaginatedResponse<Report>> {
    const { data } = await apiClient.get<PaginatedResponse<Report>>('/api/reports', { params });
    return data;
  },

  async generate(dto: GenerateReportDto): Promise<{ reportId: string }> {
    const { data } = await apiClient.post<{ reportId: string }>('/api/reports/generate', dto);
    return data;
  },

  async get(id: string): Promise<Report> {
    const { data } = await apiClient.get<Report>(`/api/reports/${id}`);
    return data;
  },

  async downloadPdf(id: string): Promise<Blob> {
    const { data } = await apiClient.get(`/api/reports/${id}/download/pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
    return data as Blob;
  },

  async downloadCsv(id: string): Promise<Blob> {
    const { data } = await apiClient.get(`/api/reports/${id}/download/csv`, {
      responseType: 'blob',
      headers: { Accept: 'text/csv' },
    });
    return data as Blob;
  },

  /** Helper: trigger browser download for a Blob */
  triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
