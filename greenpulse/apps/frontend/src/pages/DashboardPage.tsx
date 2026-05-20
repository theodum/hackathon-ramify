import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from 'recharts';
import {
  animate, motion, useMotionValue, useTransform,
} from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Wind, Zap, AlertTriangle, ChevronRight } from 'lucide-react';
import { getScoreColor, getScoreLabel, type Audit, type DashboardMetrics } from '../types';
import { auditsApi } from '../api/audits.api';
import { metricsApi } from '../api/metrics.api';
import { formatRelativeDate } from '../utils/formatters';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const A  = '#22d3a5';
const IN = '#38bdf8';
const S1 = '#ffffff';
const B1 = 'rgba(0,0,0,0.07)';

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_CO2 = Array.from({ length: 30 }, (_, i) => ({
  date: `J-${30 - i}`,
  v: Math.round(650 + Math.sin(i * 0.35) * 180 + i * 4),
}));
const DEMO_HISTORY = [
  { m: 'Jan', s: 55 }, { m: 'Fév', s: 57 }, { m: 'Mar', s: 60 },
  { m: 'Avr', s: 62 }, { m: 'Mai', s: 65 }, { m: 'Jun', s: 68 },
  { m: 'Jul', s: 70 }, { m: 'Aoû', s: 71 }, { m: 'Sep', s: 72 },
  { m: 'Oct', s: 72 }, { m: 'Nov', s: 73 }, { m: 'Déc', s: 74 },
];
const DEMO_RADAR = [
  { d: 'Frontend', v: 85 }, { d: 'Backend', v: 68 },
  { d: 'BDD',      v: 61 }, { d: 'Infra',  v: 48 },
  { d: 'IA',       v: 79 }, { d: 'Réseau', v: 74 },
];
const SEVERITY = [
  { label: 'Critique', count: 3,  color: '#f87171', pct: 7  },
  { label: 'Majeur',   count: 8,  color: '#fb923c', pct: 17 },
  { label: 'Moyen',    count: 14, color: '#fbbf24', pct: 30 },
  { label: 'Mineur',   count: 21, color: A,         pct: 46 },
];
const SPARKLINE_CO2  = [820,800,760,790,740,710,730,700];
const SPARKLINE_EN   = [3.8,3.6,3.5,3.4,3.5,3.3,3.2,3.4];
const SPARKLINE_CRIT = [9,8,7,7,5,4,4,3];
const STATUS_DOT: Record<string, string> = {
  completed: A, running: IN, failed: '#f87171', pending: '#3f3f46', cancelled: '#3f3f46',
};

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 10, fontSize: 12, color: '#475569', padding: '8px 12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle:  { color: '#0f172a' },
  cursor:     { stroke: 'rgba(0,0,0,0.06)', strokeWidth: 1 },
};
const GRID = 'rgba(0,0,0,0.06)';
const TICK = { fontSize: 10, fill: '#94a3b8' };

// ─── AnimatedNumber ───────────────────────────────────────────────────────────
function AnimatedNumber({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, v => v.toFixed(decimals));
  useEffect(() => {
    const ctrl = animate(mv, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    return ctrl.stop;
  }, [to]);
  return <motion.span>{display}</motion.span>;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const d = data.map((v, i) => ({ i, v }));
  const id = `sp-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={d} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, decimals = 0, unit, trend, sub, sparkData, sparkColor, accentColor, icon: Icon, loading,
}: {
  label: string; value: number; decimals?: number; unit?: string;
  trend: number; sub: string; sparkData: number[]; sparkColor: string;
  accentColor: string; icon: React.ElementType; loading?: boolean;
}) {
  const trendGood = trend <= 0;
  const trendColor = trendGood ? A : '#f87171';
  const TrendIcon  = trendGood ? TrendingDown : TrendingUp;

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden transition-all duration-200"
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        border: `1px solid ${B1}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.14)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = B1)}
    >
      <div className="p-5 pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="gp-label">{label}</p>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}14`, border: `1px solid ${accentColor}22` }}
          >
            <Icon size={15} style={{ color: accentColor }} />
          </div>
        </div>

        {loading ? (
          <div>
            <div className="shimmer h-9 w-28 mb-2" />
            <div className="shimmer h-3 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[2.6rem] font-bold tabular-nums tracking-tighter leading-none" style={{ color: 'var(--gp-t1)' }}>
                <AnimatedNumber to={value} decimals={decimals} />
              </span>
              {unit && <span className="text-sm font-medium" style={{ color: 'var(--gp-t2)' }}>{unit}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: trendColor, backgroundColor: `${trendColor}14` }}
              >
                <TrendIcon size={10} />
                {Math.abs(trend)}%
              </span>
              <span className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>{sub}</span>
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div className="px-2 pb-2 mt-auto">
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      )}
    </div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? A : score >= 60 ? '#fbbf24' : score >= 40 ? '#fb923c' : '#f87171';
  const r = 62;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const grade = (() => { if (score >= 90) return 'A'; if (score >= 75) return 'B'; if (score >= 60) return 'C'; if (score >= 40) return 'D'; return 'F'; })();

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div style={{ position: 'relative', width: 168, height: 168 }}>
        <svg width={168} height={168} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle cx={84} cy={84} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={8} />
          {/* Fill */}
          <circle
            cx={84} cy={84} r={r} fill="none"
            stroke={color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            filter="url(#ring-glow)"
            style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1), stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[3.2rem] font-black tabular-nums leading-none tracking-tighter"
            style={{ color: 'var(--gp-t1)' }}
          >
            {score}
          </span>
          <span className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--gp-t3)' }}>/100</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[13px] font-bold px-4 py-1.5 rounded-full"
          style={{
            color, backgroundColor: `${color}15`,
            border: `1px solid ${color}35`,
            boxShadow: `0 0 12px ${color}20`,
          }}
        >
          Grade {grade} — {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBlock({ w, h }: { w?: string; h?: number }) {
  return <div className="shimmer rounded-lg" style={{ width: w ?? '100%', height: h ?? 12 }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const [metrics,      setMetrics]      = useState<DashboardMetrics | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [recentAudits, setRecentAudits] = useState<Audit[]>([]);
  const [co2Trend,     setCo2Trend]     = useState(DEMO_CO2);
  const [history,      setHistory]      = useState(DEMO_HISTORY);
  const [radar,        setRadar]        = useState(DEMO_RADAR);

  useEffect(() => {
    metricsApi.getDashboard().then(setMetrics).catch(() => {}).finally(() => setLoading(false));
    auditsApi.list({ limit: 6 }).then(r => setRecentAudits(r.data)).catch(() => {});
    metricsApi.getTrends({ metric: 'co2_grams', days: 30 }).then(data => {
      if (data.length > 0) setCo2Trend(data.map((p, i) => ({ date: `J-${data.length - i}`, v: Math.round(p.value) })));
    }).catch(() => {});
    metricsApi.getTrends({ metric: 'score_global', days: 365 }).then(data => {
      const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      if (data.length >= 12) {
        const monthly: Record<number, number[]> = {};
        data.forEach(p => { const m = new Date(p.date).getMonth(); if (!monthly[m]) monthly[m] = []; monthly[m].push(p.value); });
        const h = Object.entries(monthly).slice(-12).map(([m, v]) => ({ m: MONTHS[+m], s: Math.round(v.reduce((a,b) => a+b,0) / v.length) }));
        if (h.length > 0) setHistory(h);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (recentAudits.length > 0) {
      const a = recentAudits[0];
      const d = [
        { d: 'Frontend', v: a.scoreFrontend ?? 0 }, { d: 'Backend', v: a.scoreBackend ?? 0 },
        { d: 'BDD',      v: a.scoreDatabase ?? 0 }, { d: 'Infra',   v: a.scoreInfra   ?? 0 },
        { d: 'IA',       v: a.scoreAi       ?? 0 }, { d: 'Réseau',  v: a.scoreNetwork  ?? 0 },
      ];
      if (d.some(x => x.v > 0)) setRadar(d);
    }
  }, [recentAudits]);

  const score   = Math.round(Number(metrics?.avgScoreGlobal ?? recentAudits[0]?.scoreGlobal ?? 72));
  const co2kg   = Number(metrics?.totalCo2GramsThisMonth ?? 1248.5) / 1000;
  const energy  = Number(metrics?.totalEnergyKwhThisMonth ?? 3.42);
  const crits   = metrics?.criticalFindingsCount ?? 3;

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[28px] font-black tracking-tight leading-tight"
            style={{ color: 'var(--gp-t1)' }}
          >
            Tableau de bord
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--gp-t3)' }}>
            {metrics
              ? `${metrics.totalAudits} audit${metrics.totalAudits > 1 ? 's' : ''} · Données en temps réel`
              : 'Vue d\'ensemble Green IT'}
          </p>
        </div>
        <button
          onClick={() => navigate('/audits')}
          className="gp-btn gp-btn-primary"
          style={{ gap: 7 }}
        >
          <Plus size={14} />
          Nouvel audit
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Score Green IT" icon={TrendingUp}
          value={score} unit="/100"
          trend={metrics?.trend?.scoreGlobal ?? -5} sub="vs mois précédent"
          sparkData={SPARKLINE_CO2.map((_, i) => 55 + i * 3)}
          sparkColor={getScoreColor(score)} accentColor={getScoreColor(score)}
          loading={loading}
        />
        <KpiCard
          label="CO₂ ce mois" icon={Wind}
          value={co2kg} decimals={1} unit="kg CO₂"
          trend={metrics?.trend?.co2 ?? -12} sub="émissions estimées"
          sparkData={SPARKLINE_CO2} sparkColor="#60a5fa" accentColor="#60a5fa"
          loading={loading}
        />
        <KpiCard
          label="Énergie" icon={Zap}
          value={energy} decimals={1} unit="kWh"
          trend={metrics?.trend?.energy ?? 8} sub="vs mois précédent"
          sparkData={SPARKLINE_EN} sparkColor={IN} accentColor={IN}
          loading={loading}
        />
        <KpiCard
          label="Points critiques" icon={AlertTriangle}
          value={crits}
          trend={-33} sub="vs dernier audit"
          sparkData={SPARKLINE_CRIT} sparkColor="#f87171" accentColor="#f87171"
          loading={loading}
        />
      </div>

      {/* Score + CO2 trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Score + Radar */}
        <div
          className="rounded-2xl p-6 flex flex-col"
          style={{ background: S1, border: `1px solid ${B1}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
        >
          <p className="gp-label mb-5">Score global</p>
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="shimmer rounded-full w-[168px] h-[168px]" />
              <SkeletonBlock w="120px" h={28} />
            </div>
          ) : (
            <ScoreGauge score={score} />
          )}
          <div className="mt-4 flex-1">
            <p className="gp-label mb-3">Couverture des domaines</p>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radar} margin={{ top: 0, right: 24, bottom: 0, left: 24 }}>
                <PolarGrid stroke={GRID} />
                <PolarAngleAxis dataKey="d" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar dataKey="v" stroke={A} fill={A} fillOpacity={0.08} strokeWidth={1.5} dot={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CO2 chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: S1, border: `1px solid ${B1}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <p className="gp-label">Émissions CO₂ — 30 derniers jours</p>
            <span className="text-[11px] font-mono px-2 py-1 rounded-lg" style={{ color: 'var(--gp-t3)', backgroundColor: 'rgba(0,0,0,0.05)' }}>
              gCO₂eq / jour
            </span>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <AreaChart data={co2Trend} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="gCo2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={A} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={A} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...CHART_TOOLTIP} />
              <Area type="monotone" dataKey="v" stroke={A} strokeWidth={2} fill="url(#gCo2)" name="CO₂ (g)" dot={false} activeDot={{ r: 4, fill: A, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Score history */}
        <div
          className="rounded-2xl p-6"
          style={{ background: S1, border: `1px solid ${B1}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
        >
          <p className="gp-label mb-5">Évolution — 12 mois</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="m" tick={TICK} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }} />
              <Bar dataKey="s" radius={[5, 5, 0, 0]} name="Score">
                {history.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.s >= 80 ? A : e.s >= 60 ? '#fbbf24' : '#f87171'}
                    fillOpacity={i === history.length - 1 ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Severity */}
        <div
          className="rounded-2xl p-6"
          style={{ background: S1, border: `1px solid ${B1}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
        >
          <p className="gp-label mb-5">Problèmes par sévérité</p>
          <div className="space-y-4">
            {SEVERITY.map(s => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}60` }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--gp-t2)' }}>{s.label}</span>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--gp-t1)' }}>{s.count}</span>
                </div>
                <div className="h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.color, opacity: 0.85 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${B1}` }}>
            <p className="gp-label mb-4">Scores par domaine</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {radar.map(item => {
                const c = getScoreColor(item.v);
                return (
                  <div key={item.d} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>{item.d}</span>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: c }}>{item.v}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent audits */}
        <div
          className="rounded-2xl p-6 flex flex-col"
          style={{ background: S1, border: `1px solid ${B1}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <p className="gp-label">Audits récents</p>
            <button
              onClick={() => navigate('/audits')}
              className="text-[11px] font-semibold transition-opacity"
              style={{ color: A }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Voir tout →
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-0.5">
            {recentAudits.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)', border: `1px solid ${B1}` }}>
                  <TrendingUp size={18} style={{ color: 'var(--gp-t3)' }} />
                </div>
                <p className="text-[12px]" style={{ color: 'var(--gp-t3)' }}>Aucun audit</p>
                <button onClick={() => navigate('/audits')} className="text-[11px] font-semibold" style={{ color: A }}>
                  Lancer un audit →
                </button>
              </div>
            ) : recentAudits.map(audit => {
              const s = audit.scoreGlobal ?? 0;
              const sc = s > 0 ? getScoreColor(s) : 'var(--gp-t3)';
              return (
                <button
                  key={audit.id}
                  onClick={() => navigate(`/audits/${audit.id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group transition-all duration-150"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_DOT[audit.status] ?? 'var(--gp-t3)', boxShadow: `0 0 6px ${STATUS_DOT[audit.status] ?? 'transparent'}60` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--gp-t1)' }}>{audit.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--gp-t3)' }}>{formatRelativeDate(audit.createdAt)}</p>
                  </div>
                  {s > 0 && (
                    <span className="text-[13px] font-bold tabular-nums shrink-0" style={{ color: sc }}>{s}</span>
                  )}
                  <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--gp-t3)' }} />
                </button>
              );
            })}
          </div>

          {/* REEN card */}
          <div
            className="mt-4 p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${A}0c 0%, rgba(56,189,248,0.05) 100%)`,
              border: `1px solid ${A}25`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[12px] font-bold" style={{ color: 'var(--gp-t1)' }}>Conformité REEN 2021</p>
              <span className="text-[11px] font-bold" style={{ color: A }}>3/5</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {[1,2,3,4,5].map(i => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{ backgroundColor: i <= 3 ? A : 'rgba(0,0,0,0.08)', boxShadow: i <= 3 ? `0 0 6px ${A}50` : 'none' }}
                />
              ))}
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-[11px] font-semibold transition-opacity"
              style={{ color: A }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Générer le rapport PDF →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
