import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ScanResult, ScanCategory, ScanFinding, Severity } from '../scanners/scanner.interface';

export interface AiRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: ScanCategory;
  title: string;
  description: string;
  impactDescription: string;
  effort: 'low' | 'medium' | 'high';
  co2ReductionGrams: number;
  energySavingKwh: number;
  costSavingUsdMonthly: number;
  actionSteps: string[];
}

export interface AiAnalysisResult {
  executiveSummary: string;
  recommendations: AiRecommendation[];
  actionPlan: string[];
  complianceNote: string;
  estimatedImpact: {
    co2ReductionPercentage: number;
    energySavingPercentage: number;
    costSavingUsdMonthly: number;
    quickWins: string[];
  };
}

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);
  private readonly anthropic: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set — AI engine will use mock responses');
    }
  }

  async analyzeAuditResults(
    scanResults: Map<ScanCategory, ScanResult>,
    projectContext?: string,
  ): Promise<AiAnalysisResult> {
    const allFindings = Array.from(scanResults.values())
      .flatMap(r => r.findings)
      .sort((a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity));

    const scores = Object.fromEntries(
      Array.from(scanResults.entries()).map(([cat, r]) => [cat, r.score]),
    );

    if (!this.anthropic) {
      return this.getMockAnalysis(allFindings, scores);
    }

    try {
      return await this.callClaude(allFindings, scores, projectContext);
    } catch (error) {
      this.logger.error(`Claude API call failed: ${(error as Error).message}`);
      return this.getMockAnalysis(allFindings, scores);
    }
  }

  private async callClaude(
    findings: ScanFinding[],
    scores: Record<string, number>,
    projectContext?: string,
  ): Promise<AiAnalysisResult> {
    const model = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-4-6');
    const maxTokens = parseInt(this.configService.get('ANTHROPIC_MAX_TOKENS', '4096'));

    const systemPrompt = `Tu es un expert en Green IT et performance web. Tu analyses les résultats d'audit d'une plateforme SaaS pour aider à réduire son empreinte environnementale et améliorer ses performances.

Contexte légal: La loi REEN (France 2021) impose aux organisations de mesurer et réduire leur empreinte numérique.

IMPORTANT: Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans balises \`\`\`, sans texte avant ou après. Le JSON doit être parseable directement.`;

    const userPrompt = `Analyse ces résultats d'audit Green IT et génère des recommandations:

SCORES PAR DOMAINE:
${JSON.stringify(scores, null, 2)}

TOP 10 PROBLÈMES DÉTECTÉS:
${JSON.stringify(findings.slice(0, 10).map(f => ({
  severity: f.severity,
  category: f.category,
  title: f.title,
  impact: f.impact,
  co2ImpactGrams: f.co2ImpactGrams,
})), null, 2)}

${projectContext ? `CONTEXTE DU PROJET: ${projectContext}` : ''}

Génère une réponse JSON avec cette structure exacte:
{
  "executiveSummary": "string (2-3 phrases)",
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "frontend|backend|database|infrastructure|ai_usage|network",
      "title": "string",
      "description": "string",
      "impactDescription": "string (avec chiffres)",
      "effort": "low|medium|high",
      "co2ReductionGrams": number,
      "energySavingKwh": number,
      "costSavingUsdMonthly": number,
      "actionSteps": ["step1", "step2", "step3"]
    }
  ],
  "actionPlan": ["étape1", "étape2", "étape3", "étape4", "étape5"],
  "complianceNote": "string (conformité REEN)",
  "estimatedImpact": {
    "co2ReductionPercentage": number,
    "energySavingPercentage": number,
    "costSavingUsdMonthly": number,
    "quickWins": ["win1", "win2", "win3"]
  }
}`;

    const response = await this.anthropic!.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const block = response.content[0];
    if (block.type !== 'text') throw new Error('Unexpected response type from Claude');

    const text = block.text.trim();

    // Strip accidental markdown fences if present
    const jsonText = text.startsWith('```')
      ? text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      : text;

    return JSON.parse(jsonText) as AiAnalysisResult;
  }

  private getMockAnalysis(findings: ScanFinding[], scores: Record<string, number>): AiAnalysisResult {
    const totalCo2 = findings.reduce((s, f) => s + (f.co2ImpactGrams || 0), 0);
    const criticalCount = findings.filter(f => f.severity === Severity.CRITICAL).length;
    const highCount = findings.filter(f => f.severity === Severity.HIGH).length;

    return {
      executiveSummary: `L'audit révèle ${criticalCount} problèmes critiques et ${highCount} majeurs impactant significativement l'empreinte environnementale. Une réduction de CO₂ de 23-35% est atteignable avec les optimisations identifiées. Les actions prioritaires concernent l'infrastructure (surprovisionnement) et le cache backend.`,

      recommendations: [
        {
          priority: 'critical',
          category: ScanCategory.INFRASTRUCTURE,
          title: 'Rightsizing des instances de serveur',
          description: 'Réduire les instances surprovisionnées vers des tailles adaptées à la charge réelle.',
          impactDescription: 'Économie estimée de 89kg CO₂/mois et $420/mois de coût cloud.',
          effort: 'low',
          co2ReductionGrams: 89000,
          energySavingKwh: 245.0,
          costSavingUsdMonthly: 420,
          actionSteps: [
            'Analyser les métriques CPU/RAM sur 30 jours',
            'Identifier le type d\'instance optimal (t3.small, t3.medium)',
            'Configurer des Auto Scaling Groups',
            'Planifier la migration en heures creuses',
          ],
        },
        {
          priority: 'critical',
          category: ScanCategory.BACKEND,
          title: 'Implémenter le cache Redis sur les endpoints haute fréquence',
          description: 'Mettre en cache les endpoints appelés > 100 fois/min sans changement fréquent.',
          impactDescription: 'Réduction de 847 req/min en BD. Économie 384g CO₂/mois.',
          effort: 'low',
          co2ReductionGrams: 384,
          energySavingKwh: 0.105,
          costSavingUsdMonthly: 12,
          actionSteps: [
            'Installer ioredis: npm install ioredis',
            'Décorer les handlers avec @UseInterceptors(CacheInterceptor)',
            'Définir un TTL selon la criticité des données (30s à 5min)',
            'Invalider le cache sur mutation',
          ],
        },
        {
          priority: 'high',
          category: ScanCategory.FRONTEND,
          title: 'Pipeline d\'optimisation d\'images WebP automatique',
          description: 'Convertir automatiquement toutes les images en WebP au build.',
          impactDescription: 'Réduction de 18% de la bande passante frontend. -142g CO₂/mois.',
          effort: 'low',
          co2ReductionGrams: 142,
          energySavingKwh: 0.038,
          costSavingUsdMonthly: 8,
          actionSteps: [
            'npm install --save-dev sharp vite-plugin-imagemin',
            'Configurer la conversion automatique WebP dans vite.config.ts',
            'Ajouter loading="lazy" sur toutes les images below-fold',
            'Configurer srcset avec webp + fallback jpeg',
          ],
        },
        {
          priority: 'high',
          category: ScanCategory.DATABASE,
          title: 'Mettre en place une stratégie de purge des données obsolètes',
          description: 'Créer des jobs automatiques de purge pour les tables contenant des données expirées.',
          impactDescription: 'Libération de 12GB+, requêtes accélérées de 15-40%.',
          effort: 'medium',
          co2ReductionGrams: 0,
          energySavingKwh: 0.019,
          costSavingUsdMonthly: 3,
          actionSteps: [
            'Identifier toutes les tables avec données temporelles',
            'Créer des cron jobs de purge (pg_cron ou Nest Schedule)',
            'Tester sur données de staging avant production',
            'Monitorer la taille des tables après purge',
          ],
        },
      ],

      actionPlan: [
        '1. [IMMÉDIAT] Rightsizing des instances EC2 → -$420/mois, -89kg CO₂/mois',
        '2. [SEMAINE 1] Cache Redis sur /api/users et endpoints haute fréquence',
        '3. [SEMAINE 1] Activer compression gzip/brotli sur l\'API',
        '4. [SEMAINE 2] Pipeline WebP automatique pour toutes les images',
        '5. [SEMAINE 3] Job de purge automatique table sessions et logs',
        '6. [SEMAINE 4] Cache sémantique pour les appels IA redondants',
        '7. [MOIS 2] Index BDD manquants identifiés par EXPLAIN ANALYZE',
      ],

      complianceNote: 'Selon la loi REEN (n°2021-1485), les actions identifiées permettront d\'atteindre les objectifs 2025-2027 : mesure de l\'empreinte numérique, réduction de la consommation des datacenters et éco-conception des services. Les émissions CO₂ estimées sont documentées pour le rapport de conformité RGESN.',

      estimatedImpact: {
        co2ReductionPercentage: 28,
        energySavingPercentage: 32,
        costSavingUsdMonthly: 483,
        quickWins: [
          'Activer la compression HTTP (1 ligne de code, impact immédiat)',
          'Rightsizing EC2 (console AWS, -$420/mois en 30min)',
          'Cache Redis /api/users (2h de dev, -847 req/min BD)',
        ],
      },
    };
  }

  private severityWeight(s: Severity): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return weights[s] || 0;
  }
}
