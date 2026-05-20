import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsHistory } from '../entities/metrics-history.entity';
import { Audit } from '../entities/audit.entity';
import { Finding } from '../entities/finding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetricsHistory, Audit, Finding])],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
