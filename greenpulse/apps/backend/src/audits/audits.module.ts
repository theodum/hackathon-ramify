import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { ScannersModule } from '../scanners/scanners.module';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { Audit } from '../entities/audit.entity';
import { ScanResult } from '../entities/scan-result.entity';
import { Finding } from '../entities/finding.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Audit, ScanResult, Finding, AiRecommendation]),
    ScannersModule,
    AiEngineModule,
  ],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule {}
