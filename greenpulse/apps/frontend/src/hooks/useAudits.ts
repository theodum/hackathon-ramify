// =============================================================
// GREENPULSE — useAudits hook
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { auditsApi, CreateAuditDto, ListAuditsParams } from '../api/audits.api';
import { useAuditStore } from '../store/useAuditStore';
import { Audit, PaginatedResponse, ApiError } from '../types';

interface UseAuditsOptions extends ListAuditsParams {
  autoFetch?: boolean;
}

interface UseAuditsReturn {
  audits: Audit[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createAudit: (dto: CreateAuditDto) => Promise<Audit | null>;
  deleteAudit: (id: string) => Promise<boolean>;
  setPage: (page: number) => void;
}

export function useAudits(options: UseAuditsOptions = {}): UseAuditsReturn {
  const { autoFetch = true, ...queryParams } = options;

  const { audits, setAudits, addAudit, removeAudit } = useAuditStore();
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(queryParams.page ?? 1);
  const [limit] = useState(queryParams.limit ?? 20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PaginatedResponse<Audit> = await auditsApi.list({
        ...queryParams,
        page,
        limit,
      });
      setAudits(result.data);
      setTotal(result.total);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de charger les audits');
    } finally {
      setLoading(false);
    }
  }, [page, limit, queryParams.projectId, queryParams.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFetch) {
      fetchAudits();
    }
  }, [fetchAudits, autoFetch]);

  const createAudit = useCallback(async (dto: CreateAuditDto): Promise<Audit | null> => {
    try {
      const newAudit = await auditsApi.create(dto);
      addAudit(newAudit);
      setTotal((t) => t + 1);
      return newAudit;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de créer l\'audit');
      return null;
    }
  }, [addAudit]);

  const deleteAudit = useCallback(async (id: string): Promise<boolean> => {
    try {
      await auditsApi.delete(id);
      removeAudit(id);
      setTotal((t) => Math.max(0, t - 1));
      return true;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de supprimer l\'audit');
      return false;
    }
  }, [removeAudit]);

  return {
    audits,
    total,
    page,
    limit,
    loading,
    error,
    refresh: fetchAudits,
    createAudit,
    deleteAudit,
    setPage,
  };
}
