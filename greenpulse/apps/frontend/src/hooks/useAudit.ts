// =============================================================
// GREENPULSE — useAudit hook (single audit by id)
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { auditsApi } from '../api/audits.api';
import { useAuditStore } from '../store/useAuditStore';
import {
  Audit,
  Finding,
  AiRecommendation,
  ScanResult,
  ApiError,
} from '../types';

interface UseAuditReturn {
  audit: Audit | null;
  findings: Finding[];
  recommendations: AiRecommendation[];
  scanResults: ScanResult[];
  loading: boolean;
  loadingResults: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  runAudit: () => Promise<boolean>;
  stopAudit: () => Promise<void>;
}

export function useAudit(id: string | null): UseAuditReturn {
  const { currentAudit, setCurrentAudit, setRunningAudit, updateAuditScore } = useAuditStore();

  const [findings, setFindings] = useState<Finding[]>([]);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const audit = await auditsApi.get(id);
      setCurrentAudit(audit);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de charger l\'audit');
    } finally {
      setLoading(false);
    }
  }, [id, setCurrentAudit]);

  const fetchResults = useCallback(async () => {
    if (!id) return;
    setLoadingResults(true);
    try {
      const results = await auditsApi.getResults(id);
      setFindings(results.findings);
      setRecommendations(results.recommendations);
      setScanResults(results.scanResults);
    } catch {
      // results may not exist yet if audit is not completed
    } finally {
      setLoadingResults(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAudit();
    }
    return () => {
      setCurrentAudit(null);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch results when audit is completed
  useEffect(() => {
    if (currentAudit?.status === 'completed') {
      fetchResults();
    }
  }, [currentAudit?.status, fetchResults]);

  const runAudit = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    try {
      const result = await auditsApi.run(id);
      if (result.started) {
        setRunningAudit(id);
        updateAuditScore(id, { status: 'running' });
      }
      return result.started;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de lancer l\'audit');
      return false;
    }
  }, [id, setRunningAudit, updateAuditScore]);

  const stopAudit = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      await auditsApi.stop(id);
      setRunningAudit(null);
      updateAuditScore(id, { status: 'cancelled' });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible d\'arrêter l\'audit');
    }
  }, [id, setRunningAudit, updateAuditScore]);

  return {
    audit: currentAudit,
    findings,
    recommendations,
    scanResults,
    loading,
    loadingResults,
    error,
    refresh: fetchAudit,
    runAudit,
    stopAudit,
  };
}
