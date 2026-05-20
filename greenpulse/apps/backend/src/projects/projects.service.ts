import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async findAll(organizationId: string): Promise<{ data: Project[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.projectRepository.findAndCount({
      where: { organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return { data, total, page: 1, limit: data.length };
  }

  async create(
    dto: CreateProjectDto,
    userId: string,
    organizationId: string,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...dto,
      organizationId,
      createdBy: userId,
      tags: dto.tags ?? [],
    });

    const saved = await this.projectRepository.save(project);
    this.logger.log(`Project created: ${saved.id} by user ${userId}`);
    return saved;
  }

  async findOne(id: string, organizationId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, organizationId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    organizationId: string,
  ): Promise<Project> {
    const project = await this.findOne(id, organizationId);
    Object.assign(project, dto);
    const saved = await this.projectRepository.save(project);
    this.logger.log(`Project updated: ${id}`);
    return saved;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const project = await this.findOne(id, organizationId);
    await this.projectRepository.remove(project);
    this.logger.log(`Project deleted: ${id}`);
  }

  async softDelete(id: string, organizationId: string): Promise<Project> {
    const project = await this.findOne(id, organizationId);
    project.isActive = false;
    const saved = await this.projectRepository.save(project);
    this.logger.log(`Project soft-deleted: ${id}`);
    return saved;
  }
}
