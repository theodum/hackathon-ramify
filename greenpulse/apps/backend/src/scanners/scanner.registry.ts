import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IScanner, ScanCategory, ScanResult, ScanTarget, ScanOptions } from './scanner.interface';
import { FrontendScanner } from './frontend/frontend.scanner';
import { BackendScanner } from './backend/backend.scanner';
import { DatabaseScanner } from './database/database.scanner';
import { InfrastructureScanner } from './infrastructure/infrastructure.scanner';
import { AiUsageScanner } from './ai-usage/ai-usage.scanner';
import { NetworkScanner } from './network/network.scanner';

@Injectable()
export class ScannerRegistry implements OnModuleInit {
  private readonly logger = new Logger(ScannerRegistry.name);
  private readonly scanners = new Map<ScanCategory, IScanner>();

  constructor(
    private readonly frontendScanner: FrontendScanner,
    private readonly backendScanner: BackendScanner,
    private readonly databaseScanner: DatabaseScanner,
    private readonly infrastructureScanner: InfrastructureScanner,
    private readonly aiUsageScanner: AiUsageScanner,
    private readonly networkScanner: NetworkScanner,
  ) {}

  onModuleInit() {
    this.register(this.frontendScanner);
    this.register(this.backendScanner);
    this.register(this.databaseScanner);
    this.register(this.infrastructureScanner);
    this.register(this.aiUsageScanner);
    this.register(this.networkScanner);
    this.logger.log(`Scanner registry initialized with ${this.scanners.size} scanners`);
  }

  private register(scanner: IScanner) {
    this.scanners.set(scanner.category, scanner);
    this.logger.log(`Registered scanner: ${scanner.name} [${scanner.category}]`);
  }

  getScanner(category: ScanCategory): IScanner | undefined {
    return this.scanners.get(category);
  }

  getAllScanners(): IScanner[] {
    return Array.from(this.scanners.values());
  }

  /**
   * Exécute les scanners demandés en parallèle (max MAX_CONCURRENT_SCANS simultanés)
   */
  async runScans(
    categories: ScanCategory[],
    target: ScanTarget,
    options: ScanOptions = {},
    onProgress?: (category: ScanCategory, result: ScanResult) => void,
  ): Promise<Map<ScanCategory, ScanResult>> {
    const results = new Map<ScanCategory, ScanResult>();
    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SCANS || '3', 10);

    // Découpage en batches pour limiter la concurrence
    const batches: ScanCategory[][] = [];
    for (let i = 0; i < categories.length; i += maxConcurrent) {
      batches.push(categories.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(async (category) => {
          const scanner = this.getScanner(category);
          if (!scanner) {
            this.logger.warn(`No scanner found for category: ${category}`);
            return;
          }

          this.logger.log(`Starting scan: ${scanner.name}`);
          const startTime = Date.now();

          try {
            const result = await Promise.race([
              scanner.scan(target, options),
              this.timeout(options.timeout || 120_000, category),
            ]);

            results.set(category, result as ScanResult);
            onProgress?.(category, result as ScanResult);
            this.logger.log(
              `Completed scan: ${scanner.name} — score: ${(result as ScanResult).score}/100 in ${Date.now() - startTime}ms`,
            );
          } catch (error) {
            this.logger.error(`Scanner failed: ${scanner.name} — ${(error as Error).message}`);
          }
        }),
      );

      // Log les erreurs batch
      batchResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          this.logger.error(`Batch scan error [${batch[i]}]: ${r.reason}`);
        }
      });
    }

    return results;
  }

  private timeout(ms: number, category: ScanCategory): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Scanner timeout after ${ms}ms: ${category}`)), ms),
    );
  }
}
