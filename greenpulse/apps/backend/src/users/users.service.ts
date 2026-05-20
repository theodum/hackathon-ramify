import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async create(data: CreateUserData): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = this.userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      organizationId: data.organizationId,
      role: data.role ?? UserRole.USER,
      isActive: true,
    });

    const saved = await this.userRepository.save(user);
    this.logger.log(`User created: ${saved.id} (${saved.email})`);
    return saved;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async findAllByOrganization(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
    this.logger.log(`User deactivated: ${id}`);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    await this.userRepository.update(id, { role });
    return this.findByIdOrThrow(id);
  }
}
