import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { Report, ReportFormat } from '../entities/report.entity';
import { Audit } from '../entities/audit.entity';
import { Finding } from '../entities/finding.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';
import { Organization } from '../entities/organization.entity';

interface FindingData {
  severity: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  affectedResource: string;
  evidence: string;
  remediation: string;
  co2ImpactGrams: number;
  energyImpactKwh: number;
}

interface RecoData {
  priority: string;
  category: string;
  title: string;
  description: string;
  impactDescription: string;
  effort: string;
  co2ReductionGrams: number;
  energySavingKwh: number;
  costSavingUsdMonthly: number;
  actionSteps: string[];
}

interface AuditReportData {
  auditId: string;
  auditName: string;
  orgName: string;
  targetUrl: string;
  date: Date;
  durationMs: number;
  status: string;
  scores: Record<string, number>;
  findings: FindingData[];
  recommendations: RecoData[];
  co2GramsEstimated: number;
  energyKwhEstimated: number;
  cloudCostUsdMonthly: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(Audit)
    private readonly auditRepo: Repository<Audit>,
    @InjectRepository(Finding)
    private readonly findingRepo: Repository<Finding>,
    @InjectRepository(AiRecommendation)
    private readonly aiRecoRepo: Repository<AiRecommendation>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async findAll(organizationId: string): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.reportRepo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return { data, total, page: 1, limit: 50 };
  }

  async createReport(auditId: string, format: ReportFormat, organizationId: string, generatedBy?: string): Promise<Report> {
    const report = this.reportRepo.create({
      auditId,
      format,
      organizationId,
      generatedBy: generatedBy ?? null,
      downloadCount: 0,
    });
    return this.reportRepo.save(report);
  }

  async getReport(id: string): Promise<Report> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException(`Rapport ${id} introuvable`);
    return report;
  }

  async generatePdfForReport(reportId: string): Promise<Buffer> {
    const report = await this.getReport(reportId);
    const data = await this.buildReportData(report.auditId);
    const buffer = await this.generatePdf(data);
    await this.reportRepo.update(reportId, { fileSizeBytes: buffer.length });
    await this.reportRepo.increment({ id: reportId }, 'downloadCount', 1);
    return buffer;
  }

  async generateCsvForReport(reportId: string): Promise<string> {
    const report = await this.getReport(reportId);
    const findings = await this.findingRepo.find({ where: { auditId: report.auditId } });
    await this.reportRepo.increment({ id: reportId }, 'downloadCount', 1);
    return this.generateCsv(findings.map(f => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description ?? '',
      impact: f.impact ?? '',
      affectedResource: f.affectedResource ?? '',
      remediation: f.remediation ?? '',
      co2ImpactGrams: f.co2ImpactGrams ?? 0,
      energyImpactKwh: f.energyImpactKwh ?? 0,
    })));
  }

  private async buildReportData(auditId: string): Promise<AuditReportData> {
    const audit = await this.auditRepo.findOne({ where: { id: auditId } });
    if (!audit) throw new NotFoundException(`Audit ${auditId} introuvable`);

    const [findings, recommendations, org] = await Promise.all([
      this.findingRepo.find({ where: { auditId }, order: { severity: 'ASC' } }),
      this.aiRecoRepo.find({ where: { auditId }, order: { priority: 'ASC' } }),
      this.orgRepo.findOne({ where: { id: audit.organizationId } }),
    ]);

    return {
      auditId,
      auditName: audit.name,
      orgName: org?.name ?? 'Organisation',
      targetUrl: audit.targetUrl ?? '',
      date: audit.completedAt ?? audit.createdAt ?? new Date(),
      durationMs: Number(audit.durationMs ?? 0),
      status: audit.status,
      scores: {
        global: Number(audit.scoreGlobal ?? 0),
        frontend: Number(audit.scoreFrontend ?? 0),
        backend: Number(audit.scoreBackend ?? 0),
        database: Number(audit.scoreDatabase ?? 0),
        infrastructure: Number(audit.scoreInfra ?? 0),
        ai: Number(audit.scoreAi ?? 0),
        network: Number(audit.scoreNetwork ?? 0),
      },
      findings: findings.map(f => ({
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description ?? '',
        impact: f.impact ?? '',
        affectedResource: f.affectedResource ?? '',
        evidence: f.evidence ? Object.entries(f.evidence).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : '',
        remediation: f.remediation ?? '',
        co2ImpactGrams: Number(f.co2ImpactGrams ?? 0),
        energyImpactKwh: Number(f.energyImpactKwh ?? 0),
      })),
      recommendations: recommendations.map(r => ({
        priority: r.priority,
        category: r.category,
        title: r.title,
        description: r.description ?? '',
        impactDescription: r.impactDescription ?? '',
        effort: r.effort ?? '',
        co2ReductionGrams: Number(r.co2ReductionGrams ?? 0),
        energySavingKwh: Number(r.energySavingKwh ?? 0),
        costSavingUsdMonthly: Number(r.costSavingUsdMonthly ?? 0),
        actionSteps: Array.isArray(r.actionSteps) ? r.actionSteps as string[] : [],
      })),
      co2GramsEstimated: Number(audit.co2GramsEstimated ?? 0),
      energyKwhEstimated: Number(audit.energyKwhEstimated ?? 0),
      cloudCostUsdMonthly: Number(audit.cloudCostUsdMonthly ?? 0),
    };
  }

  async generatePdf(data: AuditReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderCoverPage(doc, data);

      doc.addPage();
      this.renderExecutiveSummary(doc, data);

      doc.addPage();
      this.renderScores(doc, data);

      if (data.findings.length > 0) {
        doc.addPage();
        this.renderFindings(doc, data);
      }

      if (data.recommendations.length > 0) {
        doc.addPage();
        this.renderRecommendations(doc, data);
      }

      doc.addPage();
      this.renderReenCompliance(doc, data);

      doc.end();
    });
  }

  private addPageHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.rect(0, 0, doc.page.width, 8).fill('#065f46');
    doc.fillColor('#1f2937').fontSize(20).font('Helvetica-Bold').text(title, 50, 30);
    doc.rect(50, 58, 50, 3).fill('#10b981');
    doc.moveDown(2.5);
  }

  private addPageFooter(doc: PDFKit.PDFDocument, data: AuditReportData, pageLabel: string) {
    const y = doc.page.height - 35;
    doc.rect(50, y - 8, doc.page.width - 100, 1).fill('#e5e7eb');
    doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
      .text(`GreenPulse — ${data.auditName} — ${data.orgName}`, 50, y, { continued: true })
      .text(pageLabel, { align: 'right' });
  }

  private renderCoverPage(doc: PDFKit.PDFDocument, data: AuditReportData) {
    // Header banner
    doc.rect(0, 0, doc.page.width, 130).fill('#065f46');
    doc.fillColor('#ffffff')
      .fontSize(30).font('Helvetica-Bold').text('GreenPulse', 50, 40)
      .fontSize(13).font('Helvetica').text('Rapport d\'audit Green IT — Numérique Responsable', 50, 82);

    // Audit name
    doc.fillColor('#1f2937').fontSize(22).font('Helvetica-Bold').text(data.auditName, 50, 155);

    // Meta info
    doc.fontSize(11).font('Helvetica').fillColor('#6b7280')
      .text(`Organisation : ${data.orgName}`, 50, 188)
      .text(`URL auditée : ${data.targetUrl || '—'}`, 50, 206)
      .text(`Date : ${data.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, 50, 224)
      .text(`Durée d'analyse : ${data.durationMs > 0 ? (data.durationMs / 1000).toFixed(0) + 's' : '—'}`, 50, 242)
      .text(`Statut : ${data.status === 'completed' ? 'Terminé' : data.status}`, 50, 260);

    // Global score circle
    const cx = doc.page.width / 2;
    const scoreColor = this.getScoreColor(data.scores.global);
    doc.circle(cx, 360, 65).lineWidth(4).strokeColor(scoreColor).stroke();
    doc.fillColor(scoreColor).fontSize(44).font('Helvetica-Bold')
      .text(`${data.scores.global}`, cx - 32, 336);
    doc.fillColor('#374151').fontSize(11).font('Helvetica')
      .text('/100', cx + 14, 348);
    doc.fillColor('#6b7280').fontSize(11)
      .text('Score Green IT global', cx - 65, 438);
    doc.fillColor('#374151').fontSize(10)
      .text(this.scoreLabel(data.scores.global), cx - 50, 455);

    // KPI boxes
    const kpis = [
      { label: 'CO₂ estimé', value: `${data.co2GramsEstimated.toFixed(0)} g CO₂eq`, color: '#10b981' },
      { label: 'Énergie', value: `${data.energyKwhEstimated.toFixed(3)} kWh`, color: '#3b82f6' },
      { label: 'Coût cloud', value: `$${data.cloudCostUsdMonthly.toFixed(0)}/mois`, color: '#f59e0b' },
      { label: 'Problèmes', value: `${data.findings.length} détectés`, color: '#ef4444' },
    ];
    kpis.forEach((kpi, i) => {
      const x = 50 + i * 120;
      doc.rect(x, 490, 110, 65).lineWidth(1).strokeColor('#e5e7eb').stroke();
      doc.rect(x, 490, 110, 4).fill(kpi.color);
      doc.fillColor('#1f2937').fontSize(14).font('Helvetica-Bold').text(kpi.value, x + 8, 506);
      doc.fillColor('#9ca3af').fontSize(9).font('Helvetica').text(kpi.label, x + 8, 528);
    });

    // REEN badge
    doc.rect(50, 580, doc.page.width - 100, 36).fill('#f0fdf4').strokeColor('#bbf7d0').stroke();
    doc.fillColor('#065f46').fontSize(10).font('Helvetica')
      .text('✓  Rapport conforme à la loi REEN n°2021-1485 — Réduction de l\'Empreinte Environnementale du Numérique en France', 60, 592);

    // Findings summary
    const critical = data.findings.filter(f => f.severity === 'critical').length;
    const high = data.findings.filter(f => f.severity === 'high').length;
    const medium = data.findings.filter(f => f.severity === 'medium').length;
    const low = data.findings.filter(f => f.severity === 'low').length;
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
      .text(`Sévérités : ${critical} critique${critical > 1 ? 's' : ''} · ${high} majeur${high > 1 ? 's' : ''} · ${medium} moyen${medium > 1 ? 's' : ''} · ${low} mineur${low > 1 ? 's' : ''}`,
        50, 630, { align: 'center', width: doc.page.width - 100 });

    // Footer
    doc.fillColor('#d1d5db').fontSize(8)
      .text('GreenPulse — Confidentiel — ' + new Date().toLocaleDateString('fr-FR'), 50, doc.page.height - 30, { align: 'center', width: doc.page.width - 100 });
  }

  private renderExecutiveSummary(doc: PDFKit.PDFDocument, data: AuditReportData) {
    this.addPageHeader(doc, 'Résumé Exécutif');

    const critical = data.findings.filter(f => f.severity === 'critical');
    const high = data.findings.filter(f => f.severity === 'high');

    // Context paragraph
    doc.fillColor('#374151').fontSize(11).font('Helvetica')
      .text(
        `L'audit Green IT réalisé le ${data.date.toLocaleDateString('fr-FR')} sur ${data.orgName} ` +
        `(${data.targetUrl || 'site interne'}) révèle un score global de ${data.scores.global}/100 — ${this.scoreLabel(data.scores.global)}. ` +
        `L'analyse a identifié ${data.findings.length} problème${data.findings.length > 1 ? 's' : ''} au total, ` +
        `dont ${critical.length} critique${critical.length > 1 ? 's' : ''} et ${high.length} majeur${high.length > 1 ? 's' : ''} nécessitant une attention immédiate.`,
        50, doc.y, { width: doc.page.width - 100 },
      );

    doc.moveDown(1.2);

    // Environmental impact box
    const totalCo2Saved = data.recommendations.reduce((s, r) => s + r.co2ReductionGrams, 0);
    const totalCostSaved = data.recommendations.reduce((s, r) => s + r.costSavingUsdMonthly, 0);
    doc.rect(50, doc.y, doc.page.width - 100, 55).fill('#f0fdf4').strokeColor('#bbf7d0').stroke();
    doc.fillColor('#065f46').fontSize(11).font('Helvetica-Bold')
      .text('Impact environnemental', 62, doc.y + 8);
    doc.fillColor('#374151').fontSize(10).font('Helvetica')
      .text(
        `Empreinte actuelle : ${data.co2GramsEstimated.toFixed(0)} g CO₂eq · ${data.energyKwhEstimated.toFixed(3)} kWh · $${data.cloudCostUsdMonthly.toFixed(0)}/mois cloud`,
        62, doc.y + 24,
      );
    if (totalCo2Saved > 0) {
      doc.fillColor('#059669').fontSize(10)
        .text(`Potentiel d'amélioration : -${totalCo2Saved.toFixed(0)} g CO₂ · -$${totalCostSaved.toFixed(0)}/mois si recommandations appliquées`, 62, doc.y + 38);
    }
    doc.moveDown(4.5);

    // Score overview table
    doc.fillColor('#1f2937').fontSize(13).font('Helvetica-Bold').text('Scores par domaine', 50, doc.y);
    doc.moveDown(0.5);

    const domainLabels: Record<string, string> = {
      frontend: 'Frontend (Lighthouse)', backend: 'Backend (API)', database: 'Base de données',
      infrastructure: 'Infrastructure', ai: 'Usage IA', network: 'Réseau',
    };

    Object.entries(data.scores).filter(([k]) => k !== 'global').forEach(([cat, score]) => {
      const color = this.getScoreColor(score);
      const y = doc.y;
      doc.fillColor('#374151').fontSize(10).font('Helvetica').text(domainLabels[cat] || cat, 50, y);
      doc.fillColor(color).fontSize(10).font('Helvetica-Bold').text(`${score}/100`, 290, y);
      doc.rect(340, y + 2, 160, 7).fill('#f3f4f6');
      doc.rect(340, y + 2, 160 * (score / 100), 7).fill(color);
      doc.moveDown(0.9);
    });

    doc.moveDown(0.8);

    // Top critical findings
    if (critical.length > 0) {
      doc.fillColor('#1f2937').fontSize(13).font('Helvetica-Bold').text('Problèmes critiques', 50, doc.y);
      doc.moveDown(0.4);

      critical.slice(0, 5).forEach((f) => {
        const y = doc.y;
        doc.rect(50, y, 6, 30).fill('#ef4444');
        doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text(f.title, 64, y + 2, { width: doc.page.width - 120 });
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
          .text(f.impact || f.description || '', 64, y + 16, { width: doc.page.width - 120 });
        doc.moveDown(2.2);
      });
    }

    this.addPageFooter(doc, data, 'Résumé Exécutif');
  }

  private renderScores(doc: PDFKit.PDFDocument, data: AuditReportData) {
    this.addPageHeader(doc, 'Analyse des scores par domaine');

    const domainInfo: Record<string, { label: string; desc: string }> = {
      frontend: { label: 'Frontend (Lighthouse)', desc: 'Performance, accessibilité, bonnes pratiques, SEO et chargement de la page web.' },
      backend:  { label: 'Backend (API & perf.)', desc: 'Temps de réponse des endpoints, headers de cache, compression, TTL.' },
      database: { label: 'Base de données',       desc: 'Requêtes lentes, index manquants, connexions idle, taille des tables.' },
      infrastructure: { label: 'Infrastructure', desc: 'Utilisation CPU/RAM, images Docker, volumes orphelins, sizing.' },
      ai:       { label: 'Usage IA',              desc: 'Coût et consommation énergétique des appels à des APIs d\'IA.' },
      network:  { label: 'Réseau',                desc: 'Taille des payloads HTTP, compression, optimisation des transferts.' },
    };

    Object.entries(data.scores).filter(([k]) => k !== 'global').forEach(([cat, score]) => {
      const color = this.getScoreColor(score);
      const info = domainInfo[cat] || { label: cat, desc: '' };
      const y = doc.y;

      doc.rect(50, y, doc.page.width - 100, 58).lineWidth(1).strokeColor('#e5e7eb').stroke();
      doc.rect(50, y, 5, 58).fill(color);

      doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold').text(info.label, 65, y + 8);
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text(info.desc, 65, y + 24, { width: 350 });

      // Score badge
      doc.rect(doc.page.width - 120, y + 10, 70, 30).fill(color + '22');
      doc.fillColor(color).fontSize(18).font('Helvetica-Bold')
        .text(`${score}`, doc.page.width - 115, y + 14);
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
        .text('/100', doc.page.width - 92, y + 20);

      // Progress bar
      doc.rect(65, y + 44, doc.page.width - 180, 7).fill('#f3f4f6');
      doc.rect(65, y + 44, (doc.page.width - 180) * (score / 100), 7).fill(color);

      doc.moveDown(4.2);
    });

    // Global
    doc.rect(50, doc.y, doc.page.width - 100, 50).fill('#f9fafb').strokeColor('#d1d5db').stroke();
    doc.fillColor('#1f2937').fontSize(13).font('Helvetica-Bold')
      .text(`Score global : ${data.scores.global}/100 — ${this.scoreLabel(data.scores.global)}`, 65, doc.y + 15);

    this.addPageFooter(doc, data, 'Scores');
  }

  private renderFindings(doc: PDFKit.PDFDocument, data: AuditReportData) {
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    const sortedFindings = [...data.findings].sort((a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
    );

    const severityColors: Record<string, string> = {
      critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
    };
    const severityLabels: Record<string, string> = {
      critical: 'CRITIQUE', high: 'MAJEUR', medium: 'MOYEN', low: 'MINEUR',
    };

    this.addPageHeader(doc, `Problèmes détectés (${sortedFindings.length})`);

    sortedFindings.forEach((finding, i) => {
      const color = severityColors[finding.severity] || '#6b7280';
      const label = severityLabels[finding.severity] || finding.severity.toUpperCase();

      // Estimate block height to add page if needed
      const lines = [
        finding.description,
        finding.impact,
        finding.affectedResource,
        finding.evidence,
        finding.remediation,
      ].filter(Boolean).length;
      const estimatedHeight = 70 + lines * 18;

      if (doc.y + estimatedHeight > doc.page.height - 70) {
        doc.addPage();
        this.addPageHeader(doc, `Problèmes détectés (suite)`);
      }

      const y = doc.y;
      // Left severity bar
      doc.rect(50, y, 5, estimatedHeight).fill(color);

      // Severity badge
      doc.rect(65, y + 2, 60, 14).fill(color + '33');
      doc.fillColor(color).fontSize(8).font('Helvetica-Bold').text(label, 68, y + 4);

      // Category badge
      doc.rect(135, y + 2, 70, 14).fill('#f3f4f6');
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica').text(finding.category.toUpperCase(), 138, y + 4);

      // Title
      doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold')
        .text(`${i + 1}. ${finding.title}`, 65, y + 22, { width: doc.page.width - 120 });

      let currentY = y + 38;

      if (finding.description) {
        doc.fillColor('#374151').fontSize(9).font('Helvetica')
          .text(finding.description, 65, currentY, { width: doc.page.width - 120 });
        currentY = doc.y + 4;
      }

      if (finding.impact) {
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('Impact : ', 65, currentY, { continued: true });
        doc.fillColor('#374151').fontSize(9).font('Helvetica').text(finding.impact, { width: doc.page.width - 125 });
        currentY = doc.y + 2;
      }

      if (finding.affectedResource) {
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
          .text(`Ressource : ${finding.affectedResource}`, 65, currentY, { width: doc.page.width - 120 });
        currentY = doc.y + 2;
      }

      if (finding.evidence) {
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
          .text(`Preuve : ${finding.evidence}`, 65, currentY, { width: doc.page.width - 120 });
        currentY = doc.y + 2;
      }

      if (finding.remediation) {
        doc.fillColor('#059669').fontSize(9).font('Helvetica-Bold').text('Remédiation : ', 65, currentY, { continued: true });
        doc.fillColor('#059669').fontSize(9).font('Helvetica').text(finding.remediation, { width: doc.page.width - 125 });
        currentY = doc.y + 2;
      }

      if (finding.co2ImpactGrams > 0 || finding.energyImpactKwh > 0) {
        doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
          .text(`CO₂ : ${finding.co2ImpactGrams.toFixed(2)} g  ·  Énergie : ${finding.energyImpactKwh.toFixed(4)} kWh`, 65, currentY);
        currentY = doc.y + 2;
      }

      doc.moveDown(1.2);
    });

    this.addPageFooter(doc, data, 'Problèmes');
  }

  private renderRecommendations(doc: PDFKit.PDFDocument, data: AuditReportData) {
    const priorityColors: Record<string, string> = {
      critical: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#22c55e',
    };
    const priorityLabels: Record<string, string> = {
      critical: 'URGENT', high: 'IMPORTANT', medium: 'MODÉRÉ', low: 'OPTIONNEL',
    };
    const effortLabels: Record<string, string> = {
      low: 'Effort faible', medium: 'Effort moyen', high: 'Effort important',
    };

    this.addPageHeader(doc, `Recommandations IA (${data.recommendations.length})`);

    data.recommendations.forEach((reco, i) => {
      const color = priorityColors[reco.priority] || '#6b7280';
      const label = priorityLabels[reco.priority] || reco.priority.toUpperCase();

      const stepsCount = reco.actionSteps.length;
      const estimatedHeight = 85 + stepsCount * 14 + (reco.description ? 20 : 0);

      if (doc.y + estimatedHeight > doc.page.height - 70) {
        doc.addPage();
        this.addPageHeader(doc, 'Recommandations IA (suite)');
      }

      const y = doc.y;
      doc.rect(50, y, 5, estimatedHeight).fill(color);

      // Priority badge
      doc.rect(65, y + 2, 75, 14).fill(color + '33');
      doc.fillColor(color).fontSize(8).font('Helvetica-Bold').text(label, 68, y + 4);

      // Category
      doc.rect(150, y + 2, 70, 14).fill('#f3f4f6');
      doc.fillColor('#6b7280').fontSize(8).font('Helvetica').text(reco.category.toUpperCase(), 153, y + 4);

      // Effort badge
      if (reco.effort) {
        doc.rect(230, y + 2, 90, 14).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(8).font('Helvetica').text(effortLabels[reco.effort] || reco.effort, 233, y + 4);
      }

      // Title
      doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold')
        .text(`${i + 1}. ${reco.title}`, 65, y + 22, { width: doc.page.width - 120 });

      let currentY = y + 38;

      if (reco.description) {
        doc.fillColor('#374151').fontSize(9).font('Helvetica')
          .text(reco.description, 65, currentY, { width: doc.page.width - 120 });
        currentY = doc.y + 4;
      }

      if (reco.impactDescription) {
        doc.fillColor('#059669').fontSize(9).font('Helvetica-Bold').text('Impact attendu : ', 65, currentY, { continued: true });
        doc.fillColor('#059669').fontSize(9).font('Helvetica').text(reco.impactDescription, { width: doc.page.width - 125 });
        currentY = doc.y + 4;
      }

      // Savings row
      const savings: string[] = [];
      if (reco.co2ReductionGrams > 0) savings.push(`-${reco.co2ReductionGrams.toFixed(0)} g CO₂`);
      if (reco.energySavingKwh > 0) savings.push(`-${reco.energySavingKwh.toFixed(3)} kWh`);
      if (reco.costSavingUsdMonthly > 0) savings.push(`-$${reco.costSavingUsdMonthly.toFixed(0)}/mois`);
      if (savings.length > 0) {
        doc.fillColor('#10b981').fontSize(9).font('Helvetica-Bold')
          .text('Économies estimées : ' + savings.join(' · '), 65, currentY);
        currentY = doc.y + 4;
      }

      // Action steps
      if (stepsCount > 0) {
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('Étapes d\'action :', 65, currentY);
        currentY = doc.y + 2;
        reco.actionSteps.forEach((step, si) => {
          doc.fillColor('#374151').fontSize(9).font('Helvetica')
            .text(`  ${si + 1}. ${step}`, 65, currentY, { width: doc.page.width - 120 });
          currentY = doc.y + 1;
        });
      }

      doc.moveDown(1.5);
    });

    this.addPageFooter(doc, data, 'Recommandations');
  }

  private renderReenCompliance(doc: PDFKit.PDFDocument, data: AuditReportData) {
    this.addPageHeader(doc, 'Conformité loi REEN');

    doc.fillColor('#374151').fontSize(11).font('Helvetica')
      .text(
        'La loi n°2021-1485 du 15 novembre 2021 visant à réduire l\'empreinte environnementale du numérique en France (REEN) ' +
        'impose aux organisations de mesurer et réduire l\'impact environnemental de leurs services numériques.',
        50, doc.y, { width: doc.page.width - 100 },
      );
    doc.moveDown(1.2);

    const items = [
      {
        ref: 'Art. 35', title: 'Stratégie numérique responsable',
        detail: 'Définir et publier une politique de numérique responsable avec objectifs chiffrés.',
        compliant: (data.scores.global || 0) >= 60,
      },
      {
        ref: 'Art. 16', title: 'Mesure de l\'empreinte numérique',
        detail: `Empreinte mesurée : ${data.co2GramsEstimated.toFixed(0)} g CO₂eq / ${data.energyKwhEstimated.toFixed(3)} kWh.`,
        compliant: data.co2GramsEstimated > 0,
      },
      {
        ref: 'RGESN-UI-01', title: 'Éco-conception des interfaces',
        detail: `Score frontend : ${data.scores.frontend}/100. Seuil recommandé : 75/100.`,
        compliant: (data.scores.frontend || 0) >= 75,
      },
      {
        ref: 'RGESN-BE-05', title: 'Optimisation des transferts réseau',
        detail: `Score réseau : ${data.scores.network}/100. Compression, cache, minification des assets.`,
        compliant: (data.scores.network || 0) >= 75,
      },
      {
        ref: 'RGESN-INF-02', title: 'Dimensionnement adapté infrastructure',
        detail: `Score infrastructure : ${data.scores.infrastructure}/100. Éviter le surdimensionnement.`,
        compliant: (data.scores.infrastructure || 0) >= 60,
      },
      {
        ref: 'RGESN-SE-01', title: 'Mesure de la consommation des serveurs',
        detail: `Coût cloud estimé : $${data.cloudCostUsdMonthly.toFixed(0)}/mois. Optimisation possible.`,
        compliant: (data.scores.backend || 0) >= 60,
      },
    ];

    const compliantCount = items.filter(i => i.compliant).length;

    items.forEach((item) => {
      const y = doc.y;
      const color = item.compliant ? '#10b981' : '#ef4444';
      doc.rect(50, y, doc.page.width - 100, 50).lineWidth(1).strokeColor('#e5e7eb').stroke();
      doc.rect(50, y, 5, 50).fill(color);

      const statusText = item.compliant ? '✓ Conforme' : '✗ Non-conforme';
      doc.fillColor(color).fontSize(9).font('Helvetica-Bold')
        .text(item.ref, 65, y + 6)
        .text(statusText, doc.page.width - 130, y + 16);

      doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text(item.title, 65, y + 20);
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text(item.detail, 65, y + 34, { width: doc.page.width - 200 });

      doc.moveDown(3.8);
    });

    doc.moveDown(0.5);
    const globalColor = compliantCount >= 4 ? '#10b981' : compliantCount >= 2 ? '#f59e0b' : '#ef4444';
    doc.rect(50, doc.y, doc.page.width - 100, 40).fill(globalColor + '18').strokeColor(globalColor + '66').stroke();
    doc.fillColor(globalColor).fontSize(12).font('Helvetica-Bold')
      .text(
        `Conformité globale : ${compliantCount}/${items.length} critères satisfaits`,
        60, doc.y + 12,
      );

    this.addPageFooter(doc, data, 'Conformité REEN');
  }

  private getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  private scoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Satisfaisant';
    if (score >= 40) return 'À améliorer';
    return 'Critique';
  }

  generateCsv(findings: Array<Record<string, unknown>>): string {
    if (!findings.length) return 'category,severity,title,description,impact,affectedResource,remediation,co2ImpactGrams,energyImpactKwh\n';
    const headers = ['category', 'severity', 'title', 'description', 'impact', 'affectedResource', 'remediation', 'co2ImpactGrams', 'energyImpactKwh'];
    const rows = findings.map(f =>
      headers.map(h => `"${String(f[h] || '').replace(/"/g, '""')}"`).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
