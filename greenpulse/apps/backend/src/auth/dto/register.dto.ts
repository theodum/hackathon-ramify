import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128)
  password: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Martin' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001', required: false })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.USER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
