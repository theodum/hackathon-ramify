import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Audit } from './audit.entity';

export enum ScanResultCategory {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  AI_USAGE = 'ai_usage',
  NETWORK = 'network',
}

export enum ScanResultStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('scan_results')
export class ScanResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  auditId: string;

  @Column({
    type: 'enum',
    enum: ScanResultCategory,
  })
  category: ScanResultCategory;

  @Column({ type: 'smallint', nullable: true })
  score: number | null;

  @Column({
    type: 'enum',
    enum: ScanResultStatus,
    default: ScanResultStatus.PENDING,
  })
  status: ScanResultStatus;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  rawData: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // Relations
  @ManyToOne(() => Audit, (audit) => audit.scanResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @OneToMany('Finding', 'scanResult')
  findings: any[];
}
