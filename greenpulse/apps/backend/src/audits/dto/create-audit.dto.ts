import { IsString, IsArray, IsEnum, IsOptional, IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum ScanCategoryEnum {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  INFRASTRUCTURE = 'infrastructure',
  AI_USAGE = 'ai_usage',
  NETWORK = 'network',
}

export class CreateAuditDto {
  @ApiProperty({ example: 'Audit mai 2025 — Production' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ isArray: true, enum: ScanCategoryEnum, required: false })
  @IsArray()
  @IsEnum(ScanCategoryEnum, { each: true })
  @IsOptional()
  scanCategories?: ScanCategoryEnum[];

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  targetUrl?: string;
}
