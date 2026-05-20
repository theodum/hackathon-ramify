import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les projets de l\'organisation' })
  @ApiResponse({ status: 200, description: 'Liste des projets' })
  findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user.organizationId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Créer un nouveau projet' })
  @ApiResponse({ status: 201, description: 'Projet créé' })
  create(
    @Body() dto: CreateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.create(dto, req.user.id, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un projet' })
  @ApiResponse({ status: 200, description: 'Détail du projet' })
  @ApiResponse({ status: 404, description: 'Projet non trouvé' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.projectsService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Mettre à jour un projet' })
  @ApiResponse({ status: 200, description: 'Projet mis à jour' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.update(id, dto, req.user.organizationId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un projet' })
  @ApiResponse({ status: 204, description: 'Projet supprimé' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.projectsService.remove(id, req.user.organizationId);
  }
}
