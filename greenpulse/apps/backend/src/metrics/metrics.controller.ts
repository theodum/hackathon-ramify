import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @Header('Content-Type', 'text/plain')
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Métriques pour le dashboard' })
  async getDashboardMetrics(@Query('orgId') orgId?: string) {
    return this.metricsService.getDashboard(orgId);
  }

  @Get('trends')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tendances d\'une métrique sur N jours' })
  async getTrends(
    @Query('metric') metric: string,
    @Query('days') days = '30',
  ) {
    return this.metricsService.getTrends(metric, parseInt(days, 10) || 30);
  }

  @Get('co2-summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Résumé CO₂ (jour/mois)' })
  async getCo2Summary() {
    return this.metricsService.getCo2Summary();
  }
}
