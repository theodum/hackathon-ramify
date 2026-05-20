import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Project } from './project.entity';

@Entity('metrics_history')
@Index(['organizationId', 'metricName', 'recordedAt'])
export class MetricsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 255 })
  metricName: string;

  @Column({ type: 'numeric', precision: 20, scale: 6 })
  metricValue: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  recordedAt: Date;

  // Relations
  @ManyToOne(() => Organization, (org) => org.metricsHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Project, (project) => project.metricsHistory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
