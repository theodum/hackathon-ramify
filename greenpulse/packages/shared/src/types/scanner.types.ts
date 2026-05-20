export type ScanCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'infrastructure'
  | 'ai_usage'
  | 'network';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ScanResultStatus = 'completed' | 'failed' | 'skipped';

export interface ScanResult {
  id: string;
  auditId: string;
  category: ScanCategory;
  score: number;
  status: ScanResultStatus;
  durationMs: number;
  summary: string;
  findings: Finding[];
  completedAt?: string;
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
