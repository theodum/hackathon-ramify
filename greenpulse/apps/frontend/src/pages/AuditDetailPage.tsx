import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Download, StopCircle, CheckCircle2,
  AlertTriangle, Info, ChevronDown, ChevronUp, Sparkles,
  Clock, Globe, Database, Server, Cloud, Wifi, Zap, Loader2,
} from 'lucide-react';
import {
  getScoreColor, getScoreLabel, SEVERITY_CONFIG, CATEGORY_CONFIG,
  type Finding, type AiRecommendation,
} from '../types';
import { useAudit } from '../hooks/useAudit';
import { useAuditSSE } from '../hooks/useAuditSSE';
import { reportsApi } from '../api/reports.api';
import { formatDuration, formatDate } from '../utils/formatters';

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const categoryIcons: Record<string, React.ElementType> = {
  frontend: Globe, backend: Server, database: Database,
  infrastructure: Cloud, ai_usage: Sparkles, network: Wifi,
};

function ScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = getScoreColor(score);
  const sizes = { sm: 'text-sm w-10 h-10', md: 'text-xl w-14 h-14', lg: 'text-3xl w-20 h-20' };
  return (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-bold border`}
      style={{ color, borderColor: color + '40', backgroundColor: color + '15' }}
    >
      {score}
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = categoryIcons[finding.category] || Info;

  return (
    <motion.div className="border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors" layout>
      <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: config.color, backgroundColor: config.color + '20' }}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {CATEGORY_CONFIG[finding.category]?.label || finding.category}
            </span>
            {(finding.co2ImpactGrams ?? 0) > 0 && (
              <span className="text-xs text-emerald-500">
                +{Number(finding.co2ImpactGrams ?? 0) > 1000
                  ? `${(Number(finding.co2ImpactGrams ?? 0) / 1000).toFixed(1)}kg`
                  : `${Number(finding.co2ImpactGrams ?? 0).toFixed(0)}g`} CO₂
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-white mt-1">{finding.title}</p>
          {!expanded && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{finding.description}</p>}
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-500 mt-1 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 mt-1 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-3"
          >
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-300">{finding.description}</p>
            </div>
            {finding.impact && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Impact environnemental</p>
                <p className="text-sm text-orange-300">{finding.impact}</p>
              </div>
            )}
            {finding.affectedResource && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Ressource affectée</p>
                <code className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">{finding.affectedResource}</code>
              </div>
            )}
            {finding.remediation && (
              <div>
                <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide mb-1">Remédiation</p>
                <p className="text-sm text-emerald-300">{finding.remediation}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RecommendationCard({ reco }: { reco: AiRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColors: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
  };
  const color = priorityColors[reco.priority] ?? '#6b7280';
  const effortLabel = { low: 'Facile', medium: 'Modéré', high: 'Complexe' }[reco.effort] ?? reco.effort;

  return (
    <motion.div
      className="border border-gray-800 rounded-xl overflow-hidden"
      layout
      whileHover={{ borderColor: color + '40' }}
    >
      <button className="w-full flex items-start gap-4 p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Sparkles size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
              style={{ color, backgroundColor: color + '20' }}>
              {reco.priority}
            </span>
            <span className="text-xs text-gray-500">{CATEGORY_CONFIG[reco.category]?.label}</span>
            <span className="text-xs text-gray-600">Effort: {effortLabel}</span>
          </div>
          <p className="text-sm font-medium text-white mt-1">{reco.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{reco.impactDescription}</p>
        </div>
        <div className="text-right shrink-0">
          {reco.costSavingUsdMonthly > 0 && (
            <div className="text-emerald-400 text-sm font-bold">${reco.costSavingUsdMonthly}/mo</div>
          )}
          {reco.co2ReductionGrams > 0 && (
            <div className="text-gray-500 text-xs">
              -{Number(reco.co2ReductionGrams) > 1000
                ? `${(Number(reco.co2ReductionGrams) / 1000).toFixed(1)}kg`
                : `${reco.co2ReductionGrams}g`} CO₂
            </div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800 px-4 pb-4 pt-3"
          >
            <p className="text-sm text-gray-300 mb-3">{reco.description}</p>
            <div className="space-y-1.5">
              {reco.actionSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────

type TabType = 'overview' | 'findings' | 'recommendations' | 'reen';

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const {
    audit, findings, recommendations, loading, loadingResults,
    error, runAudit, stopAudit,
  } = useAudit(id ?? null);

  // Only connect SSE when audit is actually running
  const isLive = audit?.status === 'running' || audit?.status === 'pending';
  const sse = useAuditSSE(isLive ? (id ?? null) : null);

  // Switch to findings tab when results load
  useEffect(() => {
    if (findings.length > 0 && activeTab === 'overview') {
      // Don't auto-switch, just make the count visible
    }
  }, [findings.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadPdf = async () => {
    if (!audit) return;
    setDownloadingPdf(true);
    try {
      // Generate report then download
      const { reportId } = await reportsApi.generate({ auditId: audit.id, format: 'pdf' });
      const blob = await reportsApi.downloadPdf(reportId);
      reportsApi.triggerDownload(blob, `audit-${audit.id}-report.pdf`);
    } catch {
      // fallback: notify user
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-emerald-500 animate-spin" />
          <p className="text-gray-400 text-sm">Chargement de l'audit...</p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Audit introuvable</p>
          <p className="text-gray-500 text-sm mb-4">{error ?? 'Cet audit n\'existe pas ou a été supprimé.'}</p>
          <Link to="/audits">
            <button className="text-sm text-emerald-400 hover:text-emerald-300">← Retour aux audits</button>
          </Link>
        </div>
      </div>
    );
  }

  const scores = {
    global:         audit.scoreGlobal ?? 0,
    frontend:       audit.scoreFrontend ?? 0,
    backend:        audit.scoreBackend ?? 0,
    database:       audit.scoreDatabase ?? 0,
    infrastructure: audit.scoreInfra ?? 0,
    ai:             audit.scoreAi ?? 0,
    network:        audit.scoreNetwork ?? 0,
  };

  const filteredFindings = filterSeverity === 'all'
    ? findings
    : findings.filter(f => f.severity === filterSeverity);

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview',        label: 'Vue d\'ensemble' },
    { id: 'findings',        label: 'Problèmes',         count: findings.length > 0 ? findings.length : undefined },
    { id: 'recommendations', label: 'Recommandations IA', count: recommendations.length > 0 ? recommendations.length : undefined },
    { id: 'reen',            label: 'Conformité REEN' },
  ];

  const scoreEntries = [
    { label: 'Frontend',        score: scores.frontend,       icon: Globe },
    { label: 'Backend',         score: scores.backend,        icon: Server },
    { label: 'Base de données', score: scores.database,       icon: Database },
    { label: 'Infrastructure',  score: scores.infrastructure, icon: Cloud },
    { label: 'Usage IA',        score: scores.ai,             icon: Sparkles },
    { label: 'Réseau',          score: scores.network,        icon: Wifi },
  ];

  const statusBadge = {
    pending:   { label: 'En attente',    className: 'bg-gray-500/20 text-gray-400' },
    running:   { label: 'En cours...',   className: 'bg-blue-500/20 text-blue-400' },
    completed: { label: 'Terminé',       className: 'bg-emerald-500/20 text-emerald-400' },
    failed:    { label: 'Échoué',        className: 'bg-red-500/20 text-red-400' },
    cancelled: { label: 'Annulé',        className: 'bg-gray-500/20 text-gray-400' },
  }[audit.status];

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/audits">
          <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{audit.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusBadge.className}`}>
              {audit.status === 'running' && <Loader2 size={10} className="animate-spin" />}
              {audit.status === 'completed' && <CheckCircle2 size={10} />}
              {statusBadge.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
            {audit.durationMs && audit.durationMs > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatDuration(audit.durationMs)}
              </span>
            )}
            {audit.completedAt && (
              <span>{formatDate(audit.completedAt)}</span>
            )}
            {audit.project && (
              <span className="text-emerald-500">{audit.project.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={audit.status !== 'completed' || downloadingPdf}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>
          {audit.status === 'running' ? (
            <button
              onClick={stopAudit}
              className="flex items-center gap-2 text-sm bg-red-500 hover:bg-red-400 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <StopCircle size={14} /> Arrêter
            </button>
          ) : (
            <button
              onClick={runAudit}
              disabled={false}
              className="flex items-center gap-2 text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <Play size={14} />
              {audit.status === 'completed' ? 'Relancer' : 'Lancer'}
            </button>
          )}
        </div>
      </div>

      {/* SSE Progress bar */}
      <AnimatePresence>
        {sse.isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gray-900 border border-blue-500/30 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-blue-400 animate-spin" />
                <span className="text-sm text-white font-medium">Audit en cours</span>
                {sse.currentCategory && (
                  <span className="text-xs text-gray-400">
                    — {CATEGORY_CONFIG[sse.currentCategory]?.label ?? sse.currentCategory}
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-blue-400">{sse.progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                animate={{ width: `${sse.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {Object.entries(sse.scores).length > 0 && (
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {Object.entries(sse.scores).map(([cat, score]) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getScoreColor(score ?? 0) }} />
                    <span className="text-gray-400">{CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label ?? cat}</span>
                    <span className="font-medium" style={{ color: getScoreColor(score ?? 0) }}>{score}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score global + KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-4">
          {scores.global > 0
            ? <ScoreBadge score={scores.global} size="lg" />
            : <div className="w-20 h-20 rounded-xl bg-gray-800 animate-pulse" />
          }
          <div>
            <div className="text-white font-bold text-lg">
              {scores.global > 0 ? getScoreLabel(scores.global) : '—'}
            </div>
            <div className="text-gray-400 text-sm">Score global</div>
            <div className="text-gray-500 text-xs mt-0.5">Green IT</div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2">CO₂ estimé</div>
          <div className="text-2xl font-bold text-white">
            {audit.co2GramsEstimated
              ? <>{Number(audit.co2GramsEstimated).toFixed(0)}<span className="text-sm font-normal text-gray-400 ml-1">g CO₂eq</span></>
              : <span className="text-gray-600">—</span>
            }
          </div>
          <div className="text-xs text-gray-500 mt-1">Sur la période analysée</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2">Énergie estimée</div>
          <div className="text-2xl font-bold text-white">
            {audit.energyKwhEstimated
              ? <>{Number(audit.energyKwhEstimated).toFixed(2)}<span className="text-sm font-normal text-gray-400 ml-1">kWh</span></>
              : <span className="text-gray-600">—</span>
            }
          </div>
          <div className="text-xs text-gray-500 mt-1">Consommation totale</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 mb-2">Coût cloud estimé</div>
          <div className="text-2xl font-bold text-white">
            {audit.cloudCostUsdMonthly
              ? <>${Number(audit.cloudCostUsdMonthly).toFixed(0)}<span className="text-sm font-normal text-gray-400 ml-1">/mois</span></>
              : <span className="text-gray-600">—</span>
            }
          </div>
          <div className="text-xs text-gray-500 mt-1">Infrastructure cloud</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-emerald-500/20' : 'bg-gray-800'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {scoreEntries.map(({ label, score, icon: Icon }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Icon size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-400">{label}</span>
                </div>
                {loadingResults || (audit.status === 'running' && score === 0) ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-800 rounded animate-pulse w-16" />
                    <div className="h-1.5 bg-gray-800 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-2" style={{ color: score > 0 ? getScoreColor(score) : '#4b5563' }}>
                      {score > 0 ? score : '—'}
                    </div>
                    {score > 0 && (
                      <>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <motion.div
                            className="h-1.5 rounded-full"
                            style={{ backgroundColor: getScoreColor(score) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5">{getScoreLabel(score)}</div>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'findings' && (
          <motion.div key="findings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {loadingResults ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-emerald-500 animate-spin" />
              </div>
            ) : findings.length === 0 ? (
              <div className="text-center py-12">
                <Zap size={28} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  {audit.status === 'completed'
                    ? 'Aucun problème détecté — excellent !'
                    : 'Les problèmes apparaîtront une fois l\'audit terminé.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterSeverity(s)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${
                        filterSeverity === s
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {s === 'all' ? `Tous (${findings.length})` : (
                        <>
                          {SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG]?.label}
                          <span className="ml-1 opacity-60">({findings.filter(f => f.severity === s).length})</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filteredFindings.map(f => <FindingCard key={f.id} finding={f} />)}
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div key="reco" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {loadingResults ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-emerald-500 animate-spin" />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles size={28} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  {audit.status === 'completed'
                    ? 'Aucune recommandation IA disponible.'
                    : 'Les recommandations apparaîtront une fois l\'audit terminé.'}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                  <Sparkles size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Analyse IA — Plan d'action prioritisé</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {recommendations.length} recommandation{recommendations.length > 1 ? 's' : ''} générée{recommendations.length > 1 ? 's' : ''} par GPT-4o.
                      Économie totale estimée :{' '}
                      <strong className="text-emerald-400">
                        ${recommendations.reduce((acc, r) => acc + Number(r.costSavingUsdMonthly ?? 0), 0).toFixed(0)}/mois
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {recommendations.map(r => <RecommendationCard key={r.id} reco={r} />)}
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'reen' && (
          <motion.div key="reen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-3">
              {[
                {
                  ref: 'Art. 35 REEN',
                  title: 'Stratégie numérique responsable définie',
                  compliant: (scores.global ?? 0) >= 60,
                  evidence: scores.global
                    ? `Score global ${scores.global}/100 — ${getScoreLabel(scores.global)}`
                    : 'Audit en cours...',
                },
                {
                  ref: 'Art. 16 REEN',
                  title: 'Mesure de l\'empreinte numérique',
                  compliant: !!(audit.co2GramsEstimated && audit.energyKwhEstimated),
                  evidence: audit.co2GramsEstimated
                    ? `CO₂ estimé: ${Number(audit.co2GramsEstimated).toFixed(0)}g/audit, énergie: ${Number(audit.energyKwhEstimated ?? 0).toFixed(2)}kWh`
                    : 'Données non disponibles',
                },
                {
                  ref: 'RGESN-UI-01',
                  title: 'Éco-conception des interfaces utilisateur',
                  compliant: (scores.frontend ?? 0) >= 75,
                  evidence: scores.frontend
                    ? `Score frontend ${scores.frontend}/100`
                    : 'Non évalué',
                },
                {
                  ref: 'RGESN-BE-05',
                  title: 'Optimisation des transferts réseau',
                  compliant: (scores.network ?? 0) >= 75,
                  evidence: scores.network
                    ? `Score réseau ${scores.network}/100`
                    : 'Non évalué',
                },
                {
                  ref: 'RGESN-INF-02',
                  title: 'Dimensionnement adapté de l\'infrastructure',
                  compliant: (scores.infrastructure ?? 0) >= 60,
                  evidence: scores.infrastructure
                    ? `Score infra ${scores.infrastructure}/100`
                    : 'Non évalué',
                },
              ].map(item => (
                <div key={item.ref} className="flex items-start gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    item.compliant ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}>
                    {item.compliant
                      ? <CheckCircle2 size={12} className="text-emerald-400" />
                      : <AlertTriangle size={12} className="text-red-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{item.ref}</code>
                      <span className="text-sm font-medium text-white">{item.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.evidence}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    item.compliant ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.compliant ? 'Conforme' : 'Non-conforme'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
