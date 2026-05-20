// =============================================================
// GREENPULSE — Types TypeScript partagés (Frontend)
// =============================================================

export type UserRole = 'admin' | 'user' | 'viewer';
export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ScanCategory = 'frontend' | 'backend' | 'database' | 'infrastructure' | 'ai_usage' | 'network';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ReportFormat = 'pdf' | 'json' | 'csv' | 'html';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type EffortLevel = 'low' | 'medium' | 'high';

// ─────────────────────────────────────────
// USERS & AUTH
// ─────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'pro' | 'enterprise';
  industry?: string;
  size?: string;
  reenReporting: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  url?: string;
  environment?: 'production' | 'staging' | 'dev';
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────
// AUDITS
// ─────────────────────────────────────────

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
  // Scores 0-100
  scoreGlobal?: number;
  scoreFrontend?: number;
  scoreBackend?: number;
  scoreDatabase?: number;
  scoreInfra?: number;
  scoreAi?: number;
  scoreNetwork?: number;
  scoreEnergy?: number;
  scoreCo2?: number;
  // Estimations
  co2GramsEstimated?: number;
  energyKwhEstimated?: number;
  cloudCostUsdMonthly?: number;
  durationMs?: number;
  createdAt: string;
  project?: Project;
}

// ─────────────────────────────────────────
// SCAN RESULTS & FINDINGS
// ─────────────────────────────────────────

export interface ScanResult {
  id: string;
  auditId: string;
  category: ScanCategory;
  score: number;
  status: 'completed' | 'failed' | 'skipped';
  durationMs: number;
  summary: string;
  findings: Finding[];
}

export interface Finding {
  id: string;
  auditId: string;
  category: ScanCategory;
  severity: Severity;
  title: string;
  description: string;
  impact?: string;
  affectedResource?: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  co2ImpactGrams?: number;
  energyImpactKwh?: number;
  createdAt: string;
}

// ─────────────────────────────────────────
// RECOMMANDATIONS IA
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// MÉTRIQUES & DASHBOARD
// ─────────────────────────────────────────

export interface DashboardMetrics {
  totalAudits: number;
  avgScoreGlobal: number;
  totalCo2GramsThisMonth: number;
  totalEnergyKwhThisMonth: number;
  cloudCostUsdMonthly: number;
  criticalFindingsCount: number;
  trend: {
    scoreGlobal: number;    // % change vs last period
    co2: number;
    energy: number;
  };
}

export interface MetricHistory {
  date: string;
  value: number;
  unit: string;
}

export interface ScoreBreakdown {
  category: ScanCategory;
  score: number;
  label: string;
  color: string;
}

// ─────────────────────────────────────────
// RAPPORTS
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// SSE EVENTS
// ─────────────────────────────────────────

export interface AuditProgressEvent {
  type: 'progress' | 'completed' | 'error';
  auditId: string;
  category?: ScanCategory;
  score?: number;
  progress: number;
  message: string;
}

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Labels et couleurs des catégories
export const CATEGORY_CONFIG: Record<ScanCategory, { label: string; color: string; icon: string }> = {
  frontend:       { label: 'Frontend',        color: '#3b82f6', icon: 'Monitor' },
  backend:        { label: 'Backend',         color: '#8b5cf6', icon: 'Server' },
  database:       { label: 'Base de données', color: '#f59e0b', icon: 'Database' },
  infrastructure: { label: 'Infrastructure',  color: '#ef4444', icon: 'Cloud' },
  ai_usage:       { label: 'Usage IA',        color: '#10b981', icon: 'Sparkles' },
  network:        { label: 'Réseau',           color: '#06b6d4', icon: 'Network' },
};

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critique', color: '#ef4444', bgColor: '#fef2f2' },
  high:     { label: 'Majeur',   color: '#f97316', bgColor: '#fff7ed' },
  medium:   { label: 'Moyen',    color: '#eab308', bgColor: '#fefce8' },
  low:      { label: 'Mineur',   color: '#22c55e', bgColor: '#f0fdf4' },
  info:     { label: 'Info',     color: '#6b7280', bgColor: '#f9fafb' },
};

export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Correct';
  if (score >= 40) return 'À améliorer';
  return 'Critique';
}
