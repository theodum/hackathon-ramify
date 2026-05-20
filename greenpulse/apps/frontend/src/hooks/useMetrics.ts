// =============================================================
// GREENPULSE — useMetrics hook
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { metricsApi, TrendsParams, Co2Summary } from '../api/metrics.api';
import { DashboardMetrics, MetricHistory, ApiError } from '../types';

interface UseMetricsReturn {
  metrics: DashboardMetrics | null;
  co2Summary: Co2Summary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fetchTrends: (params: TrendsParams) => Promise<MetricHistory[]>;
}

export function useMetrics(orgId?: string): UseMetricsReturn {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [co2Summary, setCo2Summary] = useState<Co2Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, co2Data] = await Promise.all([
        metricsApi.getDashboard(orgId),
        metricsApi.getCo2Summary(),
      ]);
      setMetrics(dashboardData);
      setCo2Summary(co2Data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de charger les métriques');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchTrends = useCallback(async (params: TrendsParams): Promise<MetricHistory[]> => {
    try {
      return await metricsApi.getTrends(params);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de charger les tendances');
      return [];
    }
  }, []);

  return {
    metrics,
    co2Summary,
    loading,
    error,
    refresh: fetchAll,
    fetchTrends,
  };
}
