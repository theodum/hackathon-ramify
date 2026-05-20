/**
 * Interfaces du système de scanners GreenPulse.
 * Chaque scanner implémente IScanner et est enregistré dans ScannerRegistry.
 */

export enum ScanCategory {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  AI_USAGE = 'ai_usage',
  NETWORK = 'network',
}

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export interface ScanTarget {
  url?: string;              // URL cible (frontend scanner)
  apiEndpoints?: string[];   // Endpoints à analyser
  dbConnectionString?: string;
  dockerHost?: string;
  openaiApiKey?: string;
  customConfig?: Record<string, unknown>;
}

export interface ScanOptions {
  timeout?: number;
  depth?: number;            // profondeur d'analyse
  includeScreenshots?: boolean;
  lighthouseCategories?: string[];
}

export interface ScanFinding {
  id: string;
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
}

export interface ScanMetrics {
  // Communes
  durationMs: number;
  // Frontend
  lighthouseScore?: number;
  pageSizeKb?: number;
  requestCount?: number;
  unusedJsKb?: number;
  unusedCssKb?: number;
  // Backend
  avgResponseTimeMs?: number;
  p95ResponseTimeMs?: number;
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
  // Base de données
  slowQueriesCount?: number;
  missingIndexesCount?: number;
  connectionPoolUtilization?: number;
  // Infrastructure
  avgCpuAllContainers?: number;
  unusedContainersCount?: number;
  // IA
  aiCallsPerDay?: number;
  aiTokensPerDay?: number;
  aiCacheHitRate?: number;
  // Réseau
  avgPayloadSizeKb?: number;
  uncompressedRequests?: number;
}

export interface ScanResult {
  category: ScanCategory;
  score: number;           // 0-100
  findings: ScanFinding[];
  metrics: ScanMetrics;
  summary: string;
  rawData?: Record<string, unknown>;
  durationMs: number;
}

export interface IScanner {
  readonly name: string;
  readonly category: ScanCategory;
  scan(target: ScanTarget, options?: ScanOptions): Promise<ScanResult>;
  isAvailable(): Promise<boolean>;
}
