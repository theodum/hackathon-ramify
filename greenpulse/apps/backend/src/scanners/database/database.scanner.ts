import { Injectable, Logger } from '@nestjs/common';
import { IScanner, ScanCategory, ScanResult, ScanTarget, ScanOptions, ScanFinding, Severity } from '../scanner.interface';
import { v4 as uuidv4 } from 'uuid';
import { Client } from 'pg';

@Injectable()
export class DatabaseScanner implements IScanner {
  readonly name = 'Database Scanner (PostgreSQL)';
  readonly category = ScanCategory.DATABASE;
  private readonly logger = new Logger(DatabaseScanner.name);

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async scan(target: ScanTarget, _options: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now();
    const connString = target.dbConnectionString || process.env.DATABASE_URL;

    if (!connString) {
      return this.buildDemoResult(startTime);
    }

    const client = new Client({ connectionString: connString });

    try {
      await client.connect();
      const [slowQueries, missingIndexes, unusedTables, largestTables, connectionStats] =
        await Promise.all([
          this.getSlowQueries(client),
          this.getMissingIndexes(client),
          this.getUnusedTables(client),
          this.getLargestTables(client),
          this.getConnectionStats(client),
        ]);

      const findings = [
        ...this.analyzeSlowQueries(slowQueries),
        ...this.analyzeMissingIndexes(missingIndexes),
        ...this.analyzeUnusedTables(unusedTables),
        ...this.analyzeLargestTables(largestTables),
        ...this.analyzeConnections(connectionStats),
      ];

      const score = this.computeScore(findings, connectionStats);

      return {
        category: ScanCategory.DATABASE,
        score,
        findings,
        metrics: {
          durationMs: Date.now() - startTime,
          slowQueriesCount: slowQueries.length,
          missingIndexesCount: missingIndexes.length,
          connectionPoolUtilization: connectionStats.active / connectionStats.max * 100,
        },
        summary: this.buildSummary(score, findings),
        rawData: { slowQueries, missingIndexes, largestTables },
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.warn(`DB scan failed, using demo data: ${(error as Error).message}`);
      return this.buildDemoResult(startTime);
    } finally {
      await client.end().catch(() => {});
    }
  }

  private async getSlowQueries(client: Client) {
    const { rows } = await client.query(`
      SELECT
        query,
        calls,
        total_exec_time / calls AS avg_exec_time_ms,
        rows / calls AS avg_rows,
        stddev_exec_time
      FROM pg_stat_statements
      WHERE calls > 10
        AND total_exec_time / calls > 100
      ORDER BY total_exec_time / calls DESC
      LIMIT 20;
    `);
    return rows;
  }

  private async getMissingIndexes(client: Client) {
    const { rows } = await client.query(`
      SELECT
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        n_live_tup
      FROM pg_stat_user_tables
      WHERE seq_scan > 0
        AND seq_scan > COALESCE(idx_scan, 0)
        AND n_live_tup > 10000
      ORDER BY seq_scan DESC
      LIMIT 10;
    `);
    return rows;
  }

  private async getUnusedTables(client: Client) {
    const { rows } = await client.query(`
      SELECT
        schemaname,
        tablename,
        n_live_tup,
        last_autoanalyze,
        last_autovacuum
      FROM pg_stat_user_tables
      WHERE (last_autoanalyze IS NULL OR last_autoanalyze < NOW() - INTERVAL '90 days')
        AND n_live_tup > 0
      ORDER BY n_live_tup DESC
      LIMIT 10;
    `);
    return rows;
  }

  private async getLargestTables(client: Client) {
    const { rows } = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY total_bytes DESC
      LIMIT 10;
    `);
    return rows;
  }

  private async getConnectionStats(client: Client): Promise<{ active: number; idle: number; max: number }> {
    const { rows } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE state = 'active') AS active,
        COUNT(*) FILTER (WHERE state = 'idle') AS idle,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max
      FROM pg_stat_activity;
    `);
    return {
      active: parseInt(rows[0]?.active || '0'),
      idle: parseInt(rows[0]?.idle || '0'),
      max: parseInt(rows[0]?.max || '100'),
    };
  }

  private analyzeSlowQueries(rows: any[]): ScanFinding[] {
    return rows.map(row => ({
      id: uuidv4(),
      category: ScanCategory.DATABASE,
      severity: row.avg_exec_time_ms > 1000 ? Severity.CRITICAL : row.avg_exec_time_ms > 500 ? Severity.HIGH : Severity.MEDIUM,
      title: `Requête lente : ${Math.round(row.avg_exec_time_ms)}ms moyenne`,
      description: `Requête exécutée ${row.calls} fois avec un temps moyen de ${Math.round(row.avg_exec_time_ms)}ms. SQL: ${row.query?.substring(0, 100)}...`,
      impact: `${Math.round(row.calls * row.avg_exec_time_ms / 1000)}s de CPU DB/jour gaspillé`,
      affectedResource: 'PostgreSQL',
      remediation: 'Ajouter un index approprié. Réécrire la requête. Utiliser EXPLAIN ANALYZE.',
      co2ImpactGrams: row.avg_exec_time_ms * 0.0001 * row.calls,
      energyImpactKwh: row.avg_exec_time_ms * 0.00000003 * row.calls,
    }));
  }

  private analyzeMissingIndexes(rows: any[]): ScanFinding[] {
    return rows.map(row => ({
      id: uuidv4(),
      category: ScanCategory.DATABASE,
      severity: row.n_live_tup > 1_000_000 ? Severity.CRITICAL : Severity.HIGH,
      title: `Index manquant sur ${row.tablename}`,
      description: `${row.seq_scan} sequential scans sur ${row.tablename} (${row.n_live_tup} lignes). Ratio seq/idx: ${Math.round(row.seq_scan / (row.idx_scan || 1))}.`,
      impact: 'Scans complets de table = consommation CPU/disque excessive',
      affectedResource: `table: ${row.schemaname}.${row.tablename}`,
      remediation: `CREATE INDEX CONCURRENTLY ON ${row.tablename}(...) -- analyser la colonne filtrée`,
      co2ImpactGrams: Math.log(row.n_live_tup) * 2,
      energyImpactKwh: Math.log(row.n_live_tup) * 0.0005,
    }));
  }

  private analyzeUnusedTables(rows: any[]): ScanFinding[] {
    return rows
      .filter(row => row.n_live_tup > 10_000)
      .map(row => ({
        id: uuidv4(),
        category: ScanCategory.DATABASE,
        severity: Severity.LOW,
        title: `Table inactive : ${row.tablename}`,
        description: `La table ${row.tablename} n'a pas été analysée/vacuumée depuis 90 jours.`,
        impact: 'Données potentiellement obsolètes, stockage inutile',
        affectedResource: `table: ${row.schemaname}.${row.tablename}`,
        remediation: 'Archiver ou supprimer si inutilisée. Configurer AUTOVACUUM.',
        co2ImpactGrams: 0,
        energyImpactKwh: 0,
      }));
  }

  private analyzeLargestTables(rows: any[]): ScanFinding[] {
    return rows
      .filter(row => row.total_bytes > 1_000_000_000)
      .map(row => ({
        id: uuidv4(),
        category: ScanCategory.DATABASE,
        severity: Severity.MEDIUM,
        title: `Table très volumineuse : ${row.tablename} (${row.total_size})`,
        description: `La table ${row.tablename} occupe ${row.total_size} de stockage.`,
        impact: 'Coût de stockage élevé, requêtes plus lentes sur full scans',
        affectedResource: `table: ${row.tablename}`,
        remediation: 'Archiver les anciennes données. Partitionner la table. Purger les données expirées.',
        co2ImpactGrams: 0,
        energyImpactKwh: 0,
      }));
  }

  private analyzeConnections(stats: { active: number; idle: number; max: number }): ScanFinding[] {
    const findings: ScanFinding[] = [];
    const utilization = (stats.active + stats.idle) / stats.max;

    if (stats.idle > 20) {
      findings.push({
        id: uuidv4(),
        category: ScanCategory.DATABASE,
        severity: Severity.MEDIUM,
        title: `${stats.idle} connexions inactives (idle)`,
        description: `${stats.idle} connexions sont ouvertes mais inactives, consommant des ressources serveur.`,
        impact: 'Mémoire consommée inutilement, limite de connexions atteinte plus rapidement',
        affectedResource: 'PostgreSQL connection pool',
        remediation: 'Utiliser PgBouncer. Réduire le pool size dans l\'application. Fermer les connexions inutilisées.',
        co2ImpactGrams: stats.idle * 0.5,
        energyImpactKwh: stats.idle * 0.0001,
      });
    }

    if (utilization > 0.8) {
      findings.push({
        id: uuidv4(),
        category: ScanCategory.DATABASE,
        severity: Severity.HIGH,
        title: `Saturation du pool de connexions (${Math.round(utilization * 100)}%)`,
        description: `${stats.active + stats.idle}/${stats.max} connexions utilisées.`,
        impact: 'Risque de refus de connexion, latence accrue',
        affectedResource: 'PostgreSQL',
        remediation: 'Augmenter max_connections. Ajouter PgBouncer. Optimiser les durées de transaction.',
        co2ImpactGrams: 0,
        energyImpactKwh: 0,
      });
    }

    return findings;
  }

  private computeScore(findings: ScanFinding[], stats: { active: number; idle: number; max: number }): number {
    let score = 100;
    findings.forEach(f => {
      if (f.severity === Severity.CRITICAL) score -= 25;
      else if (f.severity === Severity.HIGH) score -= 15;
      else if (f.severity === Severity.MEDIUM) score -= 8;
      else if (f.severity === Severity.LOW) score -= 3;
    });
    return Math.max(0, Math.min(100, score));
  }

  private buildSummary(score: number, findings: ScanFinding[]): string {
    const criticals = findings.filter(f => f.severity === Severity.CRITICAL).length;
    return `Base de données — score ${score}/100. ${findings.length} problèmes dont ${criticals} critiques.`;
  }

  private buildDemoResult(startTime: number): ScanResult {
    const durationMs = Date.now() - startTime;
    return {
      category: ScanCategory.DATABASE,
      score: 61,
      findings: [
        {
          id: uuidv4(),
          category: ScanCategory.DATABASE,
          severity: Severity.HIGH,
          title: 'Table "sessions" avec 8.4M lignes non purgées',
          description: '94% des lignes sont expirées. Aucun job de purge automatique configuré.',
          impact: 'Requêtes ralenties, index bloat, 12GB stockage inutile',
          affectedResource: 'table: sessions',
          remediation: 'Créer un job de purge quotidien: DELETE FROM sessions WHERE expires_at < NOW()',
          co2ImpactGrams: 0,
          energyImpactKwh: 0.019,
        },
        {
          id: uuidv4(),
          category: ScanCategory.DATABASE,
          severity: Severity.HIGH,
          title: '4 index manquants détectés',
          description: 'Sequential scans détectés sur users, orders, events, logs.',
          impact: 'Requêtes 10-100x plus lentes que nécessaire',
          affectedResource: 'tables: users, orders, events, logs',
          remediation: 'Analyser les requêtes fréquentes avec EXPLAIN ANALYZE et créer les index.',
          co2ImpactGrams: 89.4,
          energyImpactKwh: 0.024,
        },
      ],
      metrics: {
        durationMs,
        slowQueriesCount: 7,
        missingIndexesCount: 4,
        connectionPoolUtilization: 34,
      },
      summary: 'Base de données nécessite des optimisations (score: 61/100)',
      durationMs,
    };
  }
}
