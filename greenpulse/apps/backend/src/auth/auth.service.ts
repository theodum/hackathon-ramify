import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const organizationId = dto.organizationId ?? '00000000-0000-0000-0000-000000000001';

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId,
      role: dto.role,
    });

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`New user registered: ${user.id} (${user.email})`);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    await this.usersService.updateLastLogin(user.id);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        // refresh tokens use longer expiry — verify without exp constraint
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const storedToken = await this.validateRefreshToken(payload.sub, refreshToken);
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token révoqué ou introuvable');
    }

    // Rotate: revoke old, issue new
    await this.revokeRefreshToken(storedToken.id);

    const user = await this.usersService.findByIdOrThrow(payload.sub);
    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const stored = await this.validateRefreshToken(userId, refreshToken);
      if (stored) {
        await this.revokeRefreshToken(stored.id);
      }
    } else {
      // Revoke all refresh tokens for the user
      await this.refreshTokenRepository.update(
        { userId, revoked: false },
        { revoked: true },
      );
    }
    this.logger.log(`User logged out: ${userId}`);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, { expiresIn: '30d' }),
    ]);

    return { accessToken, refreshToken, expiresIn: 604800 };
  }

  async saveRefreshToken(userId: string, token: string): Promise<RefreshToken> {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const entity = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
      revoked: false,
    });

    return this.refreshTokenRepository.save(entity);
  }

  async validateRefreshToken(userId: string, token: string): Promise<RefreshToken | null> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, revoked: false },
    });

    for (const stored of tokens) {
      if (stored.expiresAt < new Date()) continue;
      const matches = await bcrypt.compare(token, stored.tokenHash);
      if (matches) return stored;
    }

    return null;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, { revoked: true });
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      avatarUrl: user.avatarUrl,
    };
  }
}
