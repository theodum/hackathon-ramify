import {
  IsString,
  IsOptional,
  IsUrl,
  IsEnum,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectEnvironment } from '../../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty({ example: 'Mon Application Web' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Application principale de production', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://app.example.com', required: false })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiProperty({
    enum: ProjectEnvironment,
    default: ProjectEnvironment.PRODUCTION,
    required: false,
  })
  @IsEnum(ProjectEnvironment)
  @IsOptional()
  environment?: ProjectEnvironment;

  @ApiProperty({ example: ['web', 'nodejs', 'react'], required: false, isArray: true })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
