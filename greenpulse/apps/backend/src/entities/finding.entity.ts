import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Audit } from './audit.entity';
import { ScanResult } from './scan-result.entity';

export enum FindingCategory {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  AI_USAGE = 'ai_usage',
  NETWORK = 'network',
}

export enum FindingSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

@Entity('findings')
export class Finding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  auditId: string;

  @Column({ type: 'uuid', nullable: true })
  scanResultId: string | null;

  @Column({
    type: 'enum',
    enum: FindingCategory,
  })
  category: FindingCategory;

  @Column({
    type: 'enum',
    enum: FindingSeverity,
  })
  severity: FindingSeverity;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  impact: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  affectedResource: string | null;

  @Column({ type: 'jsonb', nullable: true })
  evidence: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  remediation: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  co2ImpactGrams: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  energyImpactKwh: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Audit, (audit) => audit.findings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @ManyToOne(() => ScanResult, (sr) => sr.findings, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'scan_result_id' })
  scanResult: ScanResult;
}
