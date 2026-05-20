// =============================================================
// GREENPULSE — useAuditSSE hook (Server-Sent Events)
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { auditsApi } from '../api/audits.api';
import { useAuditStore } from '../store/useAuditStore';
import { Audit, AuditProgressEvent, ScanCategory } from '../types';

interface AuditSSEState {
  progress: number;
  currentCategory: ScanCategory | null;
  scores: Partial<Record<ScanCategory, number>>;
  isRunning: boolean;
  isCompleted: boolean;
  error: string | null;
}

const INITIAL_STATE: AuditSSEState = {
  progress: 0,
  currentCategory: null,
  scores: {},
  isRunning: false,
  isCompleted: false,
  error: null,
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2_000;

export function useAuditSSE(auditId: string | null): AuditSSEState {
  const [state, setState] = useState<AuditSSEState>(INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setProgress, updateAuditScore, setRunningAudit } = useAuditStore();

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!auditId) return;

    cleanup();

    const es = auditsApi.getStatusStream(auditId);
    eventSourceRef.current = es;

    setState((prev) => ({ ...prev, isRunning: true, error: null }));

    es.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };

    es.onmessage = (event: MessageEvent) => {
      try {
        const payload: AuditProgressEvent = JSON.parse(event.data as string);

        if (payload.type === 'progress') {
          const progress = payload.progress ?? 0;
          setProgress(progress);

          setState((prev) => ({
            ...prev,
            progress,
            currentCategory: payload.category ?? prev.currentCategory,
            scores: payload.category && payload.score !== undefined
              ? { ...prev.scores, [payload.category]: payload.score }
              : prev.scores,
            isRunning: true,
            isCompleted: false,
            error: null,
          }));

          if (payload.category && payload.score !== undefined) {
            const scoreKey = (`score${
              payload.category.charAt(0).toUpperCase() + payload.category.slice(1)
            }`) as keyof Audit;
            updateAuditScore(auditId, { [scoreKey]: payload.score });
          }
        } else if (payload.type === 'completed') {
          setProgress(100);
          setRunningAudit(null);
          updateAuditScore(auditId, { status: 'completed' });

          setState((prev) => ({
            ...prev,
            progress: 100,
            currentCategory: null,
            isRunning: false,
            isCompleted: true,
            error: null,
          }));

          cleanup();
        } else if (payload.type === 'error') {
          updateAuditScore(auditId, { status: 'failed' });
          setState((prev) => ({
            ...prev,
            isRunning: false,
            isCompleted: false,
            error: payload.message ?? 'Erreur durant l\'audit',
          }));
          cleanup();
        }
      } catch {
        // malformed JSON — ignore
      }
    };

    es.onerror = () => {
      // EventSource closed or network error
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: 'Connexion SSE perdue — trop de tentatives',
        }));
        cleanup();
        return;
      }

      reconnectAttemptsRef.current += 1;
      const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [auditId, cleanup, setProgress, updateAuditScore, setRunningAudit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!auditId) {
      setState(INITIAL_STATE);
      return;
    }

    reconnectAttemptsRef.current = 0;
    connect();

    return () => {
      cleanup();
    };
  }, [auditId]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
