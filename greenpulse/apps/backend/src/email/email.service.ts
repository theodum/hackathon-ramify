import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ── DTO types ────────────────────────────────────────────────────────────────

export interface EmailUser {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface AuditSummary {
  id: string;
  name: string;
  scoreGlobal: number;
  scoreFrontend?: number;
  scoreBackend?: number;
  scoreInfra?: number;
  co2GramsEstimated?: number;
  energyKwhEstimated?: number;
  completedAt?: Date;
}

export interface CriticalFinding {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  remediation?: string;
  co2ImpactGrams?: number;
}

export interface WeeklyStats {
  totalAudits: number;
  avgScore: number;
  totalCo2Grams: number;
  totalEnergyKwh: number;
  improvementPercent?: number;
  topFindings?: Array<{ title: string; count: number }>;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter;
  private from!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.from = this.config.get<string>('EMAIL_FROM', 'GreenPulse <noreply@greenpulse.io>');

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'mailhog'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });

    this.logger.log(
      `Email service initialized — SMTP: ${this.config.get('SMTP_HOST', 'mailhog')}:${this.config.get('SMTP_PORT', 1025)}`,
    );
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async sendAuditCompleted(user: EmailUser, audit: AuditSummary): Promise<void> {
    const name = user.firstName ?? 'utilisateur';
    const scoreColor = this.scoreColor(audit.scoreGlobal);

    await this.send({
      to: user.email,
      subject: `Audit terminé — Score Green IT: ${audit.scoreGlobal}/100 | GreenPulse`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f7f6; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a7a4a,#34d399); padding:32px 24px; text-align:center;">
      <h1 style="color:#fff; margin:0; font-size:24px;">🌿 GreenPulse</h1>
      <p style="color:rgba(255,255,255,.85); margin:8px 0 0; font-size:14px;">Rapport d'audit Green IT</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#374151; font-size:16px;">Bonjour ${name},</p>
      <p style="color:#6b7280;">Votre audit <strong>${audit.name}</strong> est terminé.</p>

      <!-- Score global -->
      <div style="background:#f9fafb; border-radius:8px; padding:24px; text-align:center; margin:24px 0;">
        <p style="margin:0; color:#6b7280; font-size:14px; text-transform:uppercase; letter-spacing:.05em;">Score Green IT Global</p>
        <p style="margin:8px 0; font-size:56px; font-weight:700; color:${scoreColor};">${audit.scoreGlobal}</p>
        <p style="margin:0; color:#6b7280; font-size:14px;">/100</p>
      </div>

      <!-- Sous-scores -->
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr>
          <td style="padding:8px 0; color:#6b7280; font-size:14px;">Frontend</td>
          <td style="padding:8px 0; text-align:right; font-weight:600; color:${this.scoreColor(audit.scoreFrontend ?? 0)};">${audit.scoreFrontend ?? 'N/A'}/100</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#6b7280; font-size:14px; border-top:1px solid #f3f4f6;">Backend</td>
          <td style="padding:8px 0; text-align:right; font-weight:600; color:${this.scoreColor(audit.scoreBackend ?? 0)}; border-top:1px solid #f3f4f6;">${audit.scoreBackend ?? 'N/A'}/100</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#6b7280; font-size:14px; border-top:1px solid #f3f4f6;">Infrastructure</td>
          <td style="padding:8px 0; text-align:right; font-weight:600; color:${this.scoreColor(audit.scoreInfra ?? 0)}; border-top:1px solid #f3f4f6;">${audit.scoreInfra ?? 'N/A'}/100</td>
        </tr>
      </table>

      <!-- Impact environnemental -->
      ${audit.co2GramsEstimated ? `
      <div style="background:#ecfdf5; border-left:4px solid #10b981; padding:16px; border-radius:4px; margin:16px 0;">
        <p style="margin:0; color:#065f46; font-size:14px;">
          🌍 Émissions CO₂ estimées: <strong>${audit.co2GramsEstimated.toFixed(0)}g</strong>
          ${audit.energyKwhEstimated ? ` | ⚡ Énergie: <strong>${audit.energyKwhEstimated.toFixed(3)} kWh</strong>` : ''}
        </p>
      </div>` : ''}

      <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/audits/${audit.id}"
         style="display:block; text-align:center; background:#1a7a4a; color:#fff; padding:14px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin:24px 0;">
        Voir le rapport complet →
      </a>
    </div>
    <!-- Footer -->
    <div style="padding:16px 24px; background:#f9fafb; text-align:center; border-top:1px solid #f3f4f6;">
      <p style="margin:0; color:#9ca3af; font-size:12px;">GreenPulse — Plateforme d'audit Green IT | <a href="#" style="color:#6b7280;">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`,
    });
  }

  async sendCriticalAlert(user: EmailUser, finding: CriticalFinding): Promise<void> {
    const name = user.firstName ?? 'utilisateur';
    const severityColor = finding.severity === 'critical' ? '#dc2626' : '#f59e0b';

    await this.send({
      to: user.email,
      subject: `🚨 Alerte ${finding.severity.toUpperCase()} — ${finding.title} | GreenPulse`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7f6;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:${severityColor};padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ Alerte ${finding.severity.toUpperCase()}</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;">Bonjour ${name},</p>
      <p style="color:#6b7280;">Un problème critique a été détecté dans votre infrastructure :</p>
      <div style="background:#fef2f2;border-left:4px solid ${severityColor};padding:16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#991b1b;">${finding.title}</p>
        <p style="margin:0;color:#6b7280;font-size:14px;">Catégorie: ${finding.category}</p>
      </div>
      <p style="color:#374151;">${finding.description}</p>
      ${finding.remediation ? `<div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;"><p style="margin:0 0 4px;font-weight:600;color:#166534;">Remédiation recommandée :</p><p style="margin:0;color:#374151;font-size:14px;">${finding.remediation}</p></div>` : ''}
      ${finding.co2ImpactGrams ? `<p style="color:#6b7280;font-size:14px;">Impact CO₂ estimé : <strong>${finding.co2ImpactGrams.toFixed(1)}g</strong></p>` : ''}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">GreenPulse — <a href="#" style="color:#6b7280;">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`,
    });
  }

  async sendWelcome(user: EmailUser): Promise<void> {
    const name = user.firstName ?? 'utilisateur';

    await this.send({
      to: user.email,
      subject: '🌿 Bienvenue sur GreenPulse — Commencez votre premier audit',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7f6;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1a7a4a,#34d399);padding:40px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">🌿 Bienvenue sur GreenPulse</h1>
      <p style="color:rgba(255,255,255,.85);margin:12px 0 0;">Mesurez et réduisez l'empreinte carbone de vos applications</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;font-size:16px;">Bonjour ${name} ! 👋</p>
      <p style="color:#6b7280;">Votre compte GreenPulse est prêt. Commencez dès maintenant à auditer vos applications web et réduire votre impact environnemental.</p>

      <div style="margin:24px 0;">
        <h3 style="color:#374151;font-size:15px;margin-bottom:12px;">🚀 Pour démarrer :</h3>
        <ol style="color:#6b7280;font-size:14px;line-height:1.8;padding-left:20px;">
          <li>Créez votre premier <strong>projet</strong></li>
          <li>Lancez un <strong>audit Green IT</strong></li>
          <li>Consultez les <strong>recommandations IA</strong></li>
          <li>Générez votre <strong>rapport REEN</strong></li>
        </ol>
      </div>

      <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}"
         style="display:block;text-align:center;background:#1a7a4a;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:24px 0;">
        Accéder à la plateforme →
      </a>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">GreenPulse — <a href="#" style="color:#6b7280;">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`,
    });
  }

  async sendWeeklyReport(user: EmailUser, stats: WeeklyStats): Promise<void> {
    const name = user.firstName ?? 'utilisateur';
    const trend = stats.improvementPercent
      ? stats.improvementPercent > 0
        ? `<span style="color:#10b981;">▲ +${stats.improvementPercent.toFixed(1)}%</span>`
        : `<span style="color:#ef4444;">▼ ${stats.improvementPercent.toFixed(1)}%</span>`
      : '';

    await this.send({
      to: user.email,
      subject: `📊 Rapport hebdomadaire Green IT — Semaine du ${this.weekLabel()} | GreenPulse`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7f6;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1a7a4a,#34d399);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">📊 Rapport Hebdomadaire</h1>
      <p style="color:rgba(255,255,255,.85);margin:8px 0 0;font-size:14px;">Semaine du ${this.weekLabel()}</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#374151;">Bonjour ${name},</p>
      <p style="color:#6b7280;">Voici le résumé Green IT de la semaine passée.</p>

      <!-- KPIs -->
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr>
          <td style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;width:33%;">
            <p style="margin:0;font-size:28px;font-weight:700;color:#1a7a4a;">${stats.totalAudits}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Audits réalisés</p>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;width:33%;">
            <p style="margin:0;font-size:28px;font-weight:700;color:${this.scoreColor(stats.avgScore)};">${stats.avgScore.toFixed(0)}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Score moyen ${trend}</p>
          </td>
          <td style="width:8px;"></td>
          <td style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;width:33%;">
            <p style="margin:0;font-size:28px;font-weight:700;color:#374151;">${stats.totalCo2Grams.toFixed(0)}<span style="font-size:14px;">g</span></p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">CO₂ émis</p>
          </td>
        </tr>
      </table>

      ${stats.topFindings?.length ? `
      <h3 style="color:#374151;font-size:15px;margin-bottom:12px;">🔍 Problèmes les plus fréquents :</h3>
      <ul style="padding-left:20px;color:#6b7280;font-size:14px;line-height:1.8;">
        ${stats.topFindings.map((f) => `<li>${f.title} <span style="color:#9ca3af;">(${f.count}x)</span></li>`).join('')}
      </ul>` : ''}

      <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/reports"
         style="display:block;text-align:center;background:#1a7a4a;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:24px 0;">
        Voir tous les rapports →
      </a>
    </div>
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">GreenPulse — <a href="#" style="color:#6b7280;">Se désabonner</a></p>
    </div>
  </div>
</body>
</html>`,
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${(error as Error).message}`);
      throw error;
    }
  }

  private scoreColor(score: number): string {
    if (score >= 80) return '#10b981';   // green
    if (score >= 50) return '#f59e0b';   // orange
    return '#ef4444';                     // red
  }

  private weekLabel(): string {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    return startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
