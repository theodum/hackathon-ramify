import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SnakeNamingStrategy } from './config/snake-naming.strategy';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditsModule } from './audits/audits.module';
import { ScannersModule } from './scanners/scanners.module';
import { AiEngineModule } from './ai-engine/ai-engine.module';
import { ReportsModule } from './reports/reports.module';
import { MetricsModule } from './metrics/metrics.module';
import { ProjectsModule } from './projects/projects.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './email/email.module';
import { AuditQueueModule } from './queue/audit-queue.module';

// Entities
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Project } from './entities/project.entity';
import { Audit } from './entities/audit.entity';
import { ScanResult } from './entities/scan-result.entity';
import { Finding } from './entities/finding.entity';
import { AiRecommendation } from './entities/ai-recommendation.entity';
import { Report } from './entities/report.entity';
import { MetricsHistory } from './entities/metrics-history.entity';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Base de données PostgreSQL avec toutes les entités
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          Organization,
          User,
          RefreshToken,
          Project,
          Audit,
          ScanResult,
          Finding,
          AiRecommendation,
          Report,
          MetricsHistory,
        ],
        synchronize: false,
        namingStrategy: new SnakeNamingStrategy(),
        logging: config.get<string>('NODE_ENV') === 'development',
        ssl:
          config.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
        limit: config.get<number>('RATE_LIMIT_MAX', 100),
      }]),
    }),

    // Scheduler pour les audits planifiés
    ScheduleModule.forRoot(),

    // Terminus (health checks)
    TerminusModule,

    // BullMQ — async audit job queue backed by Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'redis'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // EventEmitter — SSE progress events from queue processor
    EventEmitterModule.forRoot({
      wildcard: true,
      maxListeners: 20,
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    AuditsModule,
    ScannersModule,
    AiEngineModule,
    ReportsModule,
    MetricsModule,

    // Infrastructure modules
    HealthModule,
    EmailModule,
    AuditQueueModule,
  ],
})
export class AppModule {}
