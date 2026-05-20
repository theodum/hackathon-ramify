import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report } from '../entities/report.entity';
import { Audit } from '../entities/audit.entity';
import { Finding } from '../entities/finding.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';
import { Organization } from '../entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, Audit, Finding, AiRecommendation, Organization]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
