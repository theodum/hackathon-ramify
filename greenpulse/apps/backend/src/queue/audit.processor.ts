import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ScannerRegistry } from '../scanners/scanner.registry';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { ScanCategory, ScanResult } from '../scanners/scanner.interface';
import { AUDIT_QUEUE, AuditJobPayload } from './audit-queue.constants';

export interface AuditProgressEvent {
  type: 'progress' | 'completed' | 'error';
  auditId: string;
  category?: string;
  score?: number;
  progress: number;
  message: string;
}

@Processor(AUDIT_QUEUE, {
  concurrency: 2,
})
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    private readonly scannerRegistry: ScannerRegistry,
    private readonly aiEngineService: AiEngineService,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<AuditJobPayload>): Promise<{ globalScore: number; completedAt: Date }> {
    const { auditId, target, categories, organizationId } = job.data;
    this.logger.log(`Processing audit job ${job.id} — auditId: ${auditId}`);

    try {
      // 1. Mark audit as running
      await this.updateAuditStatus(auditId, 'running', { startedAt: new Date() });

      this.emit(auditId, { type: 'progress', auditId, progress: 5, message: 'Audit démarré — initialisation des scanners...' });
      await job.updateProgress(5);

      // 2. Run all requested scanners
      const scanCategories = (categories as ScanCategory[]).filter(
        (c) => Object.values(ScanCategory).includes(c),
      );

      let completed = 0;
      const scanResults = await this.scannerRegistry.runScans(
        scanCategories,
        {
          url: target.url,
          apiEndpoints: target.apiEndpoints,
          dbConnectionString: target.dbConnectionString,
          dockerHost: target.dockerHost,
          openaiApiKey: target.openaiApiKey,
        },
        { timeout: parseInt(process.env.SCAN_TIMEOUT_MS || '120000', 10) },
        async (category, result) => {
          completed++;
          const progress = 10 + Math.round((completed / scanCategories.length) * 70);
          this.emit(auditId, {
            type: 'progress',
            auditId,
            category,
            score: result.score,
            progress,
            message: `Scanner ${category} terminé — score: ${result.score}/100`,
          });
          await job.updateProgress(progress);

          // Persist each scan result
          await this.persistScanResult(auditId, category, result);
        },
      );

      // 3. AI analysis
      this.emit(auditId, { type: 'progress', auditId, progress: 85, message: 'Analyse IA des résultats en cours...' });
      await job.updateProgress(85);

      const aiAnalysis = await this.aiEngineService.analyzeAuditResults(scanResults);

      // 4. Compute global score
      const globalScore = this.computeGlobalScore(scanResults);
      const completedAt = new Date();

      // 5. Update audit with final scores
      await this.updateAuditScores(auditId, scanResults, globalScore, completedAt);

      await job.updateProgress(100);
      this.emit(auditId, {
        type: 'completed',
        auditId,
        score: globalScore,
        progress: 100,
        message: `Audit terminé avec succès — score global: ${globalScore}/100`,
      });

      this.logger.log(`Audit ${auditId} completed — globalScore: ${globalScore}`);
      return { globalScore, completedAt };

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Audit ${auditId} failed: ${err.message}`, err.stack);

      await this.updateAuditStatus(auditId, 'failed', { errorMessage: err.message });

      this.emit(auditId, {
        type: 'error',
        auditId,
        progress: 0,
        message: `Échec de l'audit: ${err.message}`,
      });

      throw error; // re-throw so BullMQ handles retry
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed for audit ${job.data.auditId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}): ${error.message}`,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled — will be retried`);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private emit(auditId: string, event: AuditProgressEvent) {
    this.eventEmitter.emit(`audit.progress.${auditId}`, event);
    this.eventEmitter.emit('audit.progress', event);
  }

  private computeGlobalScore(results: Map<ScanCategory, ScanResult>): number {
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
      const w = weights[cat] ?? 0.1;
      total += result.score * w;
      weightSum += w;
    }

    return weightSum > 0 ? Math.round(total / weightSum) : 0;
  }

  private async updateAuditStatus(
    auditId: string,
    status: string,
    extra: { startedAt?: Date; errorMessage?: string } = {},
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE audits
         SET status = $1,
             started_at = COALESCE($2, started_at),
             error_message = COALESCE($3, error_message)
         WHERE id = $4`,
        [status, extra.startedAt ?? null, extra.errorMessage ?? null, auditId],
      );
    } catch (err) {
      this.logger.warn(`Could not update audit status for ${auditId}: ${(err as Error).message}`);
    }
  }

  private async persistScanResult(
    auditId: string,
    category: ScanCategory,
    result: ScanResult,
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO scan_results (audit_id, category, score, status, duration_ms, raw_data, summary, completed_at)
         VALUES ($1, $2, $3, 'completed', $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [
          auditId,
          category,
          result.score,
          result.durationMs,
          JSON.stringify(result.rawData ?? {}),
          result.summary,
        ],
      );
    } catch (err) {
      this.logger.warn(`Could not persist scan result for ${auditId}/${category}: ${(err as Error).message}`);
    }
  }

  private async updateAuditScores(
    auditId: string,
    results: Map<ScanCategory, ScanResult>,
    globalScore: number,
    completedAt: Date,
  ): Promise<void> {
    const get = (cat: ScanCategory) => results.get(cat)?.score ?? null;
    try {
      await this.dataSource.query(
        `UPDATE audits SET
           status            = 'completed',
           completed_at      = $1,
           score_global      = $2,
           score_frontend    = $3,
           score_backend     = $4,
           score_database    = $5,
           score_infra       = $6,
           score_ai          = $7,
           score_network     = $8
         WHERE id = $9`,
        [
          completedAt,
          globalScore,
          get(ScanCategory.FRONTEND),
          get(ScanCategory.BACKEND),
          get(ScanCategory.DATABASE),
          get(ScanCategory.INFRASTRUCTURE),
          get(ScanCategory.AI_USAGE),
          get(ScanCategory.NETWORK),
          auditId,
        ],
      );
    } catch (err) {
      this.logger.warn(`Could not update audit scores for ${auditId}: ${(err as Error).message}`);
    }
  }
}
