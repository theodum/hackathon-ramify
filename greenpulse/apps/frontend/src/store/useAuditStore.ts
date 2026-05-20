// =============================================================
// GREENPULSE — Audit Zustand Store
// =============================================================

import { create } from 'zustand';
import { Audit } from '../types';

interface AuditStore {
  audits: Audit[];
  currentAudit: Audit | null;
  runningAuditId: string | null;
  auditProgress: number;

  setAudits: (audits: Audit[]) => void;
  setCurrentAudit: (audit: Audit | null) => void;
  setRunningAudit: (id: string | null) => void;
  setProgress: (p: number) => void;
  updateAuditScore: (id: string, scores: Partial<Audit>) => void;
  addAudit: (audit: Audit) => void;
  removeAudit: (id: string) => void;
}

export const useAuditStore = create<AuditStore>((set) => ({
  audits: [],
  currentAudit: null,
  runningAuditId: null,
  auditProgress: 0,

  setAudits: (audits) => set({ audits }),

  setCurrentAudit: (audit) => set({ currentAudit: audit }),

  setRunningAudit: (id) =>
    set({ runningAuditId: id, auditProgress: id ? 0 : 100 }),

  setProgress: (p) => set({ auditProgress: p }),

  updateAuditScore: (id, scores) =>
    set((state) => ({
      audits: state.audits.map((a) => (a.id === id ? { ...a, ...scores } : a)),
      currentAudit:
        state.currentAudit?.id === id
          ? { ...state.currentAudit, ...scores }
          : state.currentAudit,
    })),

  addAudit: (audit) =>
    set((state) => ({ audits: [audit, ...state.audits] })),

  removeAudit: (id) =>
    set((state) => ({
      audits: state.audits.filter((a) => a.id !== id),
      currentAudit: state.currentAudit?.id === id ? null : state.currentAudit,
    })),
}));
