import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Request, Res, Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportFormat } from '../entities/report.entity';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les rapports de l\'organisation' })
  findAll(@Request() req: any, @Query('auditId') auditId?: string) {
    return this.reportsService.findAll(req.user.organizationId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Générer un rapport pour un audit' })
  async generate(
    @Body() body: { auditId: string; format: string },
    @Request() req: any,
  ) {
    const format = (body.format as ReportFormat) ?? ReportFormat.PDF;
    const report = await this.reportsService.createReport(
      body.auditId,
      format,
      req.user.organizationId,
      req.user.id,
    );
    return { reportId: report.id };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un rapport' })
  getOne(@Param('id') id: string) {
    return this.reportsService.getReport(id);
  }

  @Get(':id/download/pdf')
  @ApiOperation({ summary: 'Télécharger le rapport PDF' })
  @Header('Content-Type', 'application/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.reportsService.generatePdfForReport(id);
    res.set({
      'Content-Disposition': `attachment; filename="greenpulse-report-${id}.pdf"`,
      'Content-Length': pdf.length.toString(),
    });
    res.send(pdf);
  }

  @Get(':id/download/csv')
  @ApiOperation({ summary: 'Exporter les findings en CSV' })
  @Header('Content-Type', 'text/csv')
  async downloadCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.reportsService.generateCsvForReport(id);
    res.set({ 'Content-Disposition': `attachment; filename="greenpulse-findings-${id}.csv"` });
    res.send(csv);
  }
}
