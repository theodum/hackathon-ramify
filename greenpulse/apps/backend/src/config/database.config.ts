import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
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
} from '../entities';

export function getDatabaseConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
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
    synchronize: true,
    logging: config.get<string>('NODE_ENV') === 'development',
    ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
    migrations: ['dist/migrations/*.js'],
    migrationsRun: false,
  };
}
