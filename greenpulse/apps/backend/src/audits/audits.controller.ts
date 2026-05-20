import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Request, HttpCode, HttpStatus, Sse,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';

@ApiTags('audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les audits de l\'organisation' })
  findAll(@Request() req: any) {
    return this.auditsService.findAll(req.user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel audit' })
  create(@Body() dto: CreateAuditDto, @Request() req: any) {
    return this.auditsService.create(dto, req.user.id, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un audit' })
  findOne(@Param('id') id: string) {
    return this.auditsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un audit' })
  remove(@Param('id') id: string) {
    return this.auditsService.remove(id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Lancer l\'exécution d\'un audit' })
  run(@Param('id') id: string) {
    return this.auditsService.runAudit(id);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Arrêter un audit en cours' })
  stop(@Param('id') id: string) {
    return this.auditsService.stopAudit(id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Résultats complets d\'un audit' })
  getResults(@Param('id') id: string) {
    return this.auditsService.getResults(id);
  }

  @Sse(':id/status')
  @ApiOperation({ summary: 'Statut temps réel via SSE' })
  streamStatus(@Param('id') id: string): Observable<MessageEvent> {
    return this.auditsService.getStatusStream(id);
  }
}
