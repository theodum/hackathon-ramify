import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum AuditStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('audits')
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  initiatedBy: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.PENDING,
  })
  status: AuditStatus;

  @Column({ type: 'text', array: true, default: '{}' })
  scanCategories: string[];

  @Column({ type: 'text', nullable: true })
  targetUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  // Scores (smallint, nullable)
  @Column({ type: 'smallint', nullable: true })
  scoreGlobal: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreFrontend: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreBackend: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreDatabase: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreInfra: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreAi: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreNetwork: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreEnergy: number | null;

  @Column({ type: 'smallint', nullable: true })
  scoreCo2: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true })
  co2GramsEstimated: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 6, nullable: true })
  energyKwhEstimated: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  cloudCostUsdMonthly: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  lighthouseVersion: string | null;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.audits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Organization, (org) => org.audits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, (user) => user.audits, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'initiated_by' })
  initiatedByUser: User;

  @OneToMany('ScanResult', 'audit')
  scanResults: any[];

  @OneToMany('Finding', 'audit')
  findings: any[];

  @OneToMany('AiRecommendation', 'audit')
  aiRecommendations: any[];

  @OneToMany('Report', 'audit')
  reports: any[];
}
