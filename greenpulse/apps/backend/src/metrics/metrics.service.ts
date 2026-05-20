import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { register, Counter, Gauge, Histogram } from 'prom-client';
import { MetricsHistory } from '../entities/metrics-history.entity';
import { Audit, AuditStatus } from '../entities/audit.entity';
import { Finding, FindingSeverity } from '../entities/finding.entity';

@Injectable()
export class MetricsService {
  // ─── Prometheus metrics ───
  readonly auditsTotal = new Counter({
    name: 'greenpulse_audits_total',
    help: 'Total number of audits performed',
    labelNames: ['status'],
  });

  readonly auditScoreGauge = new Gauge({
    name: 'greenpulse_audit_score',
    help: 'Latest audit score by category',
    labelNames: ['category', 'org_id'],
  });

  readonly co2EstimatedGauge = new Gauge({
    name: 'greenpulse_co2_estimated_grams',
    help: 'Estimated CO2 emissions in grams',
    labelNames: ['org_id', 'project_id'],
  });

  readonly energyKwhGauge = new Gauge({
    name: 'greenpulse_energy_estimated_kwh',
    help: 'Estimated energy consumption in kWh',
    labelNames: ['org_id', 'project_id'],
  });

  readonly scanDurationHistogram = new Histogram({
    name: 'greenpulse_scan_duration_ms',
    help: 'Scan duration in milliseconds',
    labelNames: ['scanner'],
    buckets: [100, 500, 1000, 5000, 15000, 30000, 60000, 120000],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'greenpulse_http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  });

  constructor(
    @InjectRepository(MetricsHistory)
    private readonly metricsHistoryRepo: Repository<MetricsHistory>,
    @InjectRepository(Audit)
    private readonly auditRepo: Repository<Audit>,
    @InjectRepository(Finding)
    private readonly findingRepo: Repository<Finding>,
  ) {}

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async getDashboard(orgId?: string) {
    const where: Record<string, unknown> = {};
    if (orgId) where['organizationId'] = orgId;

    const [totalAudits, completedAudits] = await Promise.all([
      this.auditRepo.count({ where }),
      this.auditRepo.find({
        where: { ...where, status: AuditStatus.COMPLETED },
        order: { createdAt: 'DESC' },
        take: 100,
      }),
    ]);

    const avgScoreGlobal = completedAudits.length > 0
      ? Math.round(completedAudits.reduce((s, a) => s + (a.scoreGlobal ?? 0), 0) / completedAudits.length)
      : 0;

    // This month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthAudits = completedAudits.filter(
      a => a.completedAt && new Date(a.completedAt) >= startOfMonth,
    );

    const totalCo2GramsThisMonth = thisMonthAudits.reduce(
      (s, a) => s + (a.co2GramsEstimated ?? 0), 0,
    );
    const totalEnergyKwhThisMonth = thisMonthAudits.reduce(
      (s, a) => s + (a.energyKwhEstimated ?? 0), 0,
    );

    // Last month for trend calculation
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const lastMonthAudits = completedAudits.filter(a => {
      if (!a.completedAt) return false;
      const d = new Date(a.completedAt);
      return d >= startOfLastMonth && d < startOfMonth;
    });

    const lastMonthCo2 = lastMonthAudits.reduce(
      (s, a) => s + (a.co2GramsEstimated ?? 0), 0,
    );
    const lastMonthScore = lastMonthAudits.length > 0
      ? Math.round(lastMonthAudits.reduce((s, a) => s + (a.scoreGlobal ?? 0), 0) / lastMonthAudits.length)
      : avgScoreGlobal;

    const auditIds = completedAudits.map(a => a.id);
    const criticalFindingsCount = auditIds.length > 0
      ? await this.findingRepo.count({
          where: { auditId: In(auditIds), severity: FindingSeverity.CRITICAL },
        })
      : 0;

    const latestAudit = completedAudits[0];

    const scoreTrend = lastMonthScore > 0
      ? Math.round(((avgScoreGlobal - lastMonthScore) / lastMonthScore) * 100)
      : 0;

    const co2Trend = lastMonthCo2 > 0
      ? Math.round(((totalCo2GramsThisMonth - lastMonthCo2) / lastMonthCo2) * 100)
      : 0;

    return {
      totalAudits,
      avgScoreGlobal,
      totalCo2GramsThisMonth,
      totalEnergyKwhThisMonth,
      cloudCostUsdMonthly: latestAudit?.cloudCostUsdMonthly ?? 0,
      criticalFindingsCount,
      trend: {
        scoreGlobal: scoreTrend,
        co2: co2Trend,
        energy: 0,
      },
    };
  }

  async getTrends(metric: string, days: number): Promise<Array<{ date: string; value: number; unit: string }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await this.metricsHistoryRepo.find({
      where: { metricName: metric, recordedAt: MoreThanOrEqual(since) },
      order: { recordedAt: 'ASC' },
      take: days,
    });

    return records.map(r => ({
      date: r.recordedAt.toISOString().split('T')[0],
      value: Number(r.metricValue),
      unit: r.unit ?? '',
    }));
  }

  async getCo2Summary() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayAudits, monthAudits] = await Promise.all([
      this.auditRepo.find({
        where: { status: AuditStatus.COMPLETED, completedAt: MoreThanOrEqual(startOfDay) },
      }),
      this.auditRepo.find({
        where: { status: AuditStatus.COMPLETED, completedAt: MoreThanOrEqual(startOfMonth) },
      }),
    ]);

    const daily = todayAudits.reduce((s, a) => s + (a.co2GramsEstimated ?? 0), 0);
    const monthly = monthAudits.reduce((s, a) => s + (a.co2GramsEstimated ?? 0), 0);

    return { daily, monthly, trend: -5 };
  }

  recordAuditCompleted(
    orgId: string,
    scores: Record<string, number>,
    co2: number,
    energy: number,
  ) {
    this.auditsTotal.inc({ status: 'completed' });

    Object.entries(scores).forEach(([category, score]) => {
      this.auditScoreGauge.set({ category, org_id: orgId }, score);
    });

    this.co2EstimatedGauge.set({ org_id: orgId, project_id: 'default' }, co2);
    this.energyKwhGauge.set({ org_id: orgId, project_id: 'default' }, energy);
  }
}
