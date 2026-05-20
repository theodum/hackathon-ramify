import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  /**
   * GET /api/health
   * Full health check: PostgreSQL, heap memory, RSS memory, disk.
   * Used by Docker healthchecks and monitoring systems.
   * Returns { status: 'ok' | 'error', info: {...}, error: {...}, details: {...} }
   */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check', description: 'Checks PostgreSQL, memory (heap > 80% of 512MB = warn), RSS (> 800MB = warn), disk (> 90% used = warn)' })
  check() {
    return this.health.check([
      // PostgreSQL via TypeORM
      () => this.db.pingCheck('postgresql', { timeout: 3000 }),

      // Heap memory — warn if > 80% of 512MB
      () => this.memory.checkHeap('memory_heap', Math.round(512 * 1024 * 1024 * 0.8)),

      // RSS memory — warn if > 800MB
      () => this.memory.checkRSS('memory_rss', 800 * 1024 * 1024),

      // Disk — warn if > 90% used (threshold = 0.9 means 90%)
      () =>
        this.disk.checkStorage('disk_storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * GET /api/health/ready
   * Lightweight readiness probe — checks DB only.
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — checks DB connectivity' })
  ready() {
    return this.health.check([
      () => this.db.pingCheck('postgresql', { timeout: 2000 }),
    ]);
  }

  /**
   * GET /api/health/live
   * Liveness probe — returns 200 if the process is alive.
   */
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — returns 200 if process is alive' })
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }
}
