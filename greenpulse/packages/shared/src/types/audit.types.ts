import type { ScanCategory, ScanResult, Finding } from './scanner.types';

export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ReportFormat = 'pdf' | 'json' | 'csv' | 'html';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type EffortLevel = 'low' | 'medium' | 'high';

export interface Audit {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  status: AuditStatus;
  scanCategories: ScanCategory[];
  targetUrl?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  scoreGlobal?: number;
  scoreFrontend?: number;
  scoreBackend?: number;
  scoreDatabase?: number;
  scoreInfra?: number;
  scoreAi?: number;
  scoreNetwork?: number;
  scoreEnergy?: number;
  scoreCo2?: number;
  co2GramsEstimated?: number;
  energyKwhEstimated?: number;
  cloudCostUsdMonthly?: number;
  durationMs?: number;
  createdAt: string;
}

export interface AiRecommendation {
  id: string;
  auditId: string;
  priority: RecommendationPriority;
  category: ScanCategory;
  title: string;
  description: string;
  impactDescription: string;
  effort: EffortLevel;
  co2ReductionGrams: number;
  energySavingKwh: number;
  costSavingUsdMonthly: number;
  actionSteps: string[];
  isApplied: boolean;
  appliedAt?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  auditId: string;
  format: ReportFormat;
  filePath?: string;
  fileSizeBytes?: number;
  downloadCount: number;
  expiresAt?: string;
  createdAt: string;
}

export interface AuditProgressEvent {
  type: 'progress' | 'completed' | 'error';
  auditId: string;
  category?: ScanCategory;
  score?: number;
  progress: number;
  message: string;
}

export interface AuditResults {
  auditId: string;
  findings: Finding[];
  recommendations: AiRecommendation[];
  scanResults: ScanResult[];
}

export interface DashboardMetrics {
  totalAudits: number;
  avgScoreGlobal: number;
  totalCo2GramsThisMonth: number;
  totalEnergyKwhThisMonth: number;
  cloudCostUsdMonthly: number;
  criticalFindingsCount: number;
  trend: {
    scoreGlobal: number;
    co2: number;
    energy: number;
  };
}

export interface MetricHistory {
  date: string;
  value: number;
  unit: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
