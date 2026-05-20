import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditProcessor } from './audit.processor';
import { ScannersModule } from '../scanners/scanners.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { AUDIT_QUEUE } from './audit-queue.constants';

export { AUDIT_QUEUE } from './audit-queue.constants';
export type { AuditJobPayload } from './audit-queue.constants';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: AUDIT_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'redis'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 3600,      // keep completed jobs 1h
            count: 100,
          },
          removeOnFail: {
            age: 86400,     // keep failed jobs 24h
          },
        },
      }),
    }),
    ScannersModule,
    AiEngineModule,
  ],
  providers: [AuditProcessor],
  exports: [
    BullModule,   // export so other modules can inject the queue
  ],
})
export class AuditQueueModule {}
