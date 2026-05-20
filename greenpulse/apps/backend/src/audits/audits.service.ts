import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ScannerRegistry } from '../scanners/scanner.registry';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { ScanCategory, ScanResult as IScanResult } from '../scanners/scanner.interface';
import { CreateAuditDto } from './dto/create-audit.dto';
import { Audit, AuditStatus } from '../entities/audit.entity';
import { ScanResult, ScanResultCategory, ScanResultStatus } from '../entities/scan-result.entity';
import { Finding, FindingCategory, FindingSeverity } from '../entities/finding.entity';
import { AiRecommendation, RecommendationPriority, RecommendationCategory, RecommendationEffort } from '../entities/ai-recommendation.entity';

// Statuts de progression SSE
interface AuditProgressEvent {
  type: 'progress' | 'completed' | 'error';
  auditId: string;
  category?: ScanCategory;
  score?: number;
  progress: number;   // 0-100
  message: string;
}

// Map scanner category to entity enum
const categoryMap: Record<ScanCategory, ScanResultCategory> = {
  [ScanCategory.FRONTEND]: ScanResultCategory.FRONTEND,
  [ScanCategory.BACKEND]: ScanResultCategory.BACKEND,
  [ScanCategory.DATABASE]: ScanResultCategory.DATABASE,
  [ScanCategory.INFRASTRUCTURE]: ScanResultCategory.INFRASTRUCTURE,
  [ScanCategory.AI_USAGE]: ScanResultCategory.AI_USAGE,
  [ScanCategory.NETWORK]: ScanResultCategory.NETWORK,
};

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);
  private readonly progressSubjects = new Map<string, Subject<AuditProgressEvent>>();

  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
    @InjectRepository(ScanResult)
    private readonly scanResultRepository: Repository<ScanResult>,
    @InjectRepository(Finding)
    private readonly findingRepository: Repository<Finding>,
    @InjectRepository(AiRecommendation)
    private readonly aiRecommendationRepository: Repository<AiRecommendation>,
    private readonly scannerRegistry: ScannerRegistry,
    private readonly aiEngineService: AiEngineService,
  ) {}

  async findAll(organizationId: string): Promise<{ data: Audit[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.auditRepository.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { data, total, page: 1, limit: 50 };
  }

  async create(dto: CreateAuditDto, userId: string, organizationId: string): Promise<Audit> {
    const audit = this.auditRepository.create({
      name: dto.name,
      projectId: dto.projectId,
      organizationId,
      initiatedBy: userId,
      status: AuditStatus.PENDING,
      scanCategories: dto.scanCategories ?? Object.values(ScanCategory),
      targetUrl: dto.targetUrl ?? null,
    });

    const saved = await this.auditRepository.save(audit);
    this.logger.log(`Audit created: ${saved.id} for org: ${organizationId}`);
    return saved;
  }

  async findOne(id: string): Promise<Audit> {
    const audit = await this.auditRepository.findOne({
      where: { id },
      relations: ['scanResults', 'findings', 'aiRecommendations'],
    });

    if (!audit) {
      throw new NotFoundException(`Audit ${id} not found`);
    }

    return audit;
  }

  async remove(id: string): Promise<void> {
    const audit = await this.auditRepository.findOne({ where: { id } });
    if (!audit) {
      throw new NotFoundException(`Audit ${id} not found`);
    }
    await this.auditRepository.remove(audit);
    this.logger.log(`Audit deleted: ${id}`);
  }

  async getResults(id: string) {
    const audit = await this.findOne(id);

    return {
      auditId: id,
      findings: audit.findings ?? [],
      recommendations: audit.aiRecommendations ?? [],
      scanResults: audit.scanResults ?? [],
    };
  }

  async runAudit(auditId: string): Promise<{ started: boolean; auditId: string }> {
    const audit = await this.auditRepository.findOne({ where: { id: auditId } });

    if (!audit) {
      throw new NotFoundException(`Audit ${auditId} not found`);
    }

    if (audit.status === AuditStatus.RUNNING) {
      throw new BadRequestException('Cet audit est déjà en cours d\'exécution');
    }

    // Mark as running
    await this.auditRepository.update(auditId, {
      status: AuditStatus.RUNNING,
      startedAt: new Date(),
    });

    const subject = new Subject<AuditProgressEvent>();
    this.progressSubjects.set(auditId, subject);

    // Exécution asynchrone
    this.executeAudit(auditId, subject).catch(async (err) => {
      this.logger.error(`Audit execution failed: ${err.message}`);
      await this.auditRepository.update(auditId, {
        status: AuditStatus.FAILED,
        errorMessage: err.message,
        completedAt: new Date(),
      });
      subject.next({
        type: 'error',
        auditId,
        progress: 0,
        message: `Erreur: ${err.message}`,
      });
      subject.complete();
    });

    return { started: true, auditId };
  }

  async stopAudit(auditId: string): Promise<{ stopped: boolean }> {
    const subject = this.progressSubjects.get(auditId);
    if (subject) {
      subject.complete();
      this.progressSubjects.delete(auditId);
    }

    await this.auditRepository.update(auditId, {
      status: AuditStatus.CANCELLED,
      completedAt: new Date(),
    });

    return { stopped: true };
  }

  getStatusStream(auditId: string): Observable<MessageEvent> {
    const subject = this.progressSubjects.get(auditId) || new Subject<AuditProgressEvent>();
    if (!this.progressSubjects.has(auditId)) {
      this.progressSubjects.set(auditId, subject);
    }

    return new Observable(observer => {
      const sub = subject.subscribe({
        next: (event) => {
          observer.next({ data: event } as MessageEvent);
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });

      return () => sub.unsubscribe();
    });
  }

  // ── Private execution ──────────────────────────────────────────────────────

  private async executeAudit(
    auditId: string,
    progress: Subject<AuditProgressEvent>,
  ): Promise<void> {
    const audit = await this.auditRepository.findOne({ where: { id: auditId } });
    if (!audit) throw new Error(`Audit ${auditId} not found`);

    const rawCategories = audit.scanCategories;
    let categories: ScanCategory[];
    if (Array.isArray(rawCategories) && rawCategories.length > 0) {
      categories = rawCategories as ScanCategory[];
    } else if (typeof rawCategories === 'string' && (rawCategories as string).length > 2) {
      categories = (rawCategories as string)
        .replace(/^{|}$/g, '')
        .split(',')
        .filter(Boolean) as ScanCategory[];
    } else {
      categories = Object.values(ScanCategory);
    }

    const target = {
      url: audit.targetUrl ?? process.env.DEFAULT_SCAN_URL ?? 'https://example.com',
      dbConnectionString: process.env.DATABASE_URL,
    };

    let completed = 0;
    const startTime = Date.now();

    const scanResults = await this.scannerRegistry.runScans(
      categories,
      target,
      { timeout: 60_000 },
      async (category, result) => {
        completed++;

        // Persist scan result
        const scanResultEntity = this.scanResultRepository.create({
          auditId,
          category: categoryMap[category],
          score: result.score,
          status: ScanResultStatus.COMPLETED,
          durationMs: result.durationMs,
          rawData: result.rawData,
          summary: result.summary,
          completedAt: new Date(),
        });
        const savedScanResult = await this.scanResultRepository.save(scanResultEntity);

        // Persist findings
        for (const finding of result.findings) {
          const findingEntity = this.findingRepository.create({
            auditId,
            scanResultId: savedScanResult.id,
            category: categoryMap[category] as unknown as FindingCategory,
            severity: finding.severity as unknown as FindingSeverity,
            title: finding.title,
            description: finding.description,
            impact: finding.impact,
            affectedResource: finding.affectedResource,
            evidence: finding.evidence,
            remediation: finding.remediation,
            co2ImpactGrams: finding.co2ImpactGrams,
            energyImpactKwh: finding.energyImpactKwh,
          });
          await this.findingRepository.save(findingEntity);
        }

        progress.next({
          type: 'progress',
          auditId,
          category,
          score: result.score,
          progress: Math.round((completed / categories.length) * 85),
          message: `Scanner ${category} terminé — score: ${result.score}/100`,
        });
      },
    );

    progress.next({
      type: 'progress',
      auditId,
      progress: 90,
      message: 'Analyse IA en cours...',
    });

    const aiAnalysis = await this.aiEngineService.analyzeAuditResults(scanResults);

    // Persist AI recommendations
    if (aiAnalysis?.recommendations) {
      for (const rec of aiAnalysis.recommendations) {
        const recEntity = this.aiRecommendationRepository.create({
          auditId,
          priority: (rec.priority as RecommendationPriority) ?? RecommendationPriority.MEDIUM,
          category: (rec.category as unknown as RecommendationCategory) ?? RecommendationCategory.GENERAL,
          title: rec.title,
          description: rec.description,
          impactDescription: rec.impactDescription,
          effort: (rec.effort as RecommendationEffort) ?? RecommendationEffort.MEDIUM,
          co2ReductionGrams: rec.co2ReductionGrams,
          energySavingKwh: rec.energySavingKwh,
          costSavingUsdMonthly: rec.costSavingUsdMonthly,
          actionSteps: rec.actionSteps,
        });
        await this.aiRecommendationRepository.save(recEntity);
      }
    }

    const globalScore = this.computeGlobalScore(scanResults);
    const durationMs = Date.now() - startTime;

    // Build per-category scores
    const scores: Partial<Record<string, number>> = {};
    for (const [cat, result] of scanResults.entries()) {
      const key = `score${cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_([a-z])/g, (_m, c) => c.toUpperCase())}`;
      scores[key] = result.score;
    }

    // Update audit with final scores
    await this.auditRepository.update(auditId, {
      status: AuditStatus.COMPLETED,
      completedAt: new Date(),
      durationMs,
      scoreGlobal: globalScore,
      scoreFrontend: scanResults.get(ScanCategory.FRONTEND)?.score ?? null,
      scoreBackend: scanResults.get(ScanCategory.BACKEND)?.score ?? null,
      scoreDatabase: scanResults.get(ScanCategory.DATABASE)?.score ?? null,
      scoreInfra: scanResults.get(ScanCategory.INFRASTRUCTURE)?.score ?? null,
      scoreAi: scanResults.get(ScanCategory.AI_USAGE)?.score ?? null,
      scoreNetwork: scanResults.get(ScanCategory.NETWORK)?.score ?? null,
    });

    progress.next({
      type: 'completed',
      auditId,
      score: globalScore,
      progress: 100,
      message: `Audit terminé — score global: ${globalScore}/100`,
    });

    progress.complete();
    this.progressSubjects.delete(auditId);
  }

  private computeGlobalScore(results: Map<ScanCategory, IScanResult>): number {
    const weights: Record<ScanCategory, number> = {
      [ScanCategory.FRONTEND]: 0.2,
      [ScanCategory.BACKEND]: 0.2,
      [ScanCategory.DATABASE]: 0.15,
      [ScanCategory.INFRASTRUCTURE]: 0.25,
      [ScanCategory.AI_USAGE]: 0.1,
      [ScanCategory.NETWORK]: 0.1,
    };

    let total = 0;
    let weightSum = 0;

    for (const [cat, result] of results.entries()) {
      const w = weights[cat] || 0.1;
      total += result.score * w;
      weightSum += w;
    }

    return weightSum > 0 ? Math.round(total / weightSum) : 0;
  }
}
