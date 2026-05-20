import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Audit } from './audit.entity';

export enum RecommendationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum RecommendationCategory {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  AI_USAGE = 'ai_usage',
  NETWORK = 'network',
  GENERAL = 'general',
}

export enum RecommendationEffort {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('ai_recommendations')
export class AiRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  auditId: string;

  @Column({
    type: 'enum',
    enum: RecommendationPriority,
    default: RecommendationPriority.MEDIUM,
  })
  priority: RecommendationPriority;

  @Column({
    type: 'enum',
    enum: RecommendationCategory,
    default: RecommendationCategory.GENERAL,
  })
  category: RecommendationCategory;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  impactDescription: string | null;

  @Column({
    type: 'enum',
    enum: RecommendationEffort,
    default: RecommendationEffort.MEDIUM,
  })
  effort: RecommendationEffort;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  co2ReductionGrams: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  energySavingKwh: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  costSavingUsdMonthly: number | null;

  @Column({ type: 'jsonb', nullable: true })
  actionSteps: string[] | null;

  @Column({ type: 'boolean', default: false })
  isApplied: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  appliedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Audit, (audit) => audit.aiRecommendations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;
}
