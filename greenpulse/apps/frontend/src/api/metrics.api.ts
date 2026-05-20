// =============================================================
// GREENPULSE — Metrics API
// =============================================================

import { apiClient } from './client';
import { DashboardMetrics, MetricHistory } from '../types';

export interface TrendsParams {
  metric: string;
  days: number;
}

export interface Co2Summary {
  daily: number;
  monthly: number;
  trend: number;
}

export const metricsApi = {
  async getDashboard(orgId?: string): Promise<DashboardMetrics> {
    const params = orgId ? { orgId } : undefined;
    const { data } = await apiClient.get<DashboardMetrics>('/api/metrics/dashboard', { params });
    return data;
  },

  async getTrends(params: TrendsParams): Promise<MetricHistory[]> {
    const { data } = await apiClient.get<MetricHistory[]>('/api/metrics/trends', { params });
    return data;
  },

  async getCo2Summary(): Promise<Co2Summary> {
    const { data } = await apiClient.get<Co2Summary>('/api/metrics/co2-summary');
    return data;
  },
};
