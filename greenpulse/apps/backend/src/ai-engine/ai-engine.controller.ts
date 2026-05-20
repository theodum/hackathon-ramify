import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiEngineService } from './ai-engine.service';
import { ScanCategory } from '../scanners/scanner.interface';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiEngineController {
  constructor(private readonly aiEngineService: AiEngineService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyser les résultats d\'un audit avec l\'IA' })
  async analyze(@Body() body: { auditId: string; projectContext?: string }) {
    // En production: charger les scan results de la BD
    const mockResults = new Map();
    return this.aiEngineService.analyzeAuditResults(mockResults, body.projectContext);
  }

  @Get('recommendations/:auditId')
  @ApiOperation({ summary: 'Récupérer les recommandations IA pour un audit' })
  getRecommendations(@Param('auditId') auditId: string) {
    return { auditId, recommendations: [] };
  }

  @Post('action-plan')
  @ApiOperation({ summary: 'Générer un plan d\'action priorisé' })
  generateActionPlan(@Body() body: { auditId: string }) {
    return {
      auditId: body.auditId,
      actionPlan: [
        '1. [IMMÉDIAT] Rightsizing EC2 → -$420/mois, -89kg CO₂/mois',
        '2. [SEMAINE 1] Cache Redis endpoints haute fréquence',
        '3. [SEMAINE 1] Activer compression gzip/brotli',
        '4. [SEMAINE 2] Pipeline WebP automatique',
        '5. [SEMAINE 3] Job purge sessions expirées',
      ],
    };
  }
}
