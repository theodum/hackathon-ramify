import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Play, Trash2, Clock, Loader2,
  ChevronRight, RefreshCw, X, Zap,
} from 'lucide-react';
import { getScoreColor, getScoreLabel, type ScanCategory } from '../types';
import { useAudits } from '../hooks/useAudits';
import { useProjects } from '../hooks/useProjects';
import { auditsApi } from '../api/audits.api';
import { formatRelativeDate, formatDuration } from '../utils/formatters';

const A = '#22d3a5';

const STATUS: Record<string, { label: string; color: string; bg: string; spin?: boolean }> = {
  pending:   { label: 'En attente', color: '#71717a',  bg: 'rgba(113,113,122,0.1)' },
  running:   { label: 'En cours',   color: '#60a5fa',  bg: 'rgba(96,165,250,0.1)', spin: true },
  completed: { label: 'Terminé',    color: A,          bg: `${A}15` },
  failed:    { label: 'Échoué',     color: '#f87171',  bg: 'rgba(248,113,113,0.1)' },
  cancelled: { label: 'Annulé',     color: '#71717a',  bg: 'rgba(113,113,122,0.1)' },
};

const SCAN_CATEGORIES: { id: ScanCategory; label: string; desc: string; icon: string }[] = [
  { id: 'frontend',       label: 'Frontend',        desc: 'Lighthouse, images, JS/CSS',  icon: '⚡' },
  { id: 'backend',        label: 'Backend',         desc: 'API temps de réponse, cache', icon: '⚙️' },
  { id: 'database',       label: 'Base de données', desc: 'Requêtes lentes, index',      icon: '🗄️' },
  { id: 'infrastructure', label: 'Infrastructure',  desc: 'Containers, cloud, CPU',      icon: '☁️' },
  { id: 'ai_usage',       label: 'Usage IA',        desc: 'Coût tokens, cache IA',       icon: '🤖' },
  { id: 'network',        label: 'Réseau',           desc: 'Payloads, compression',       icon: '🌐' },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

function NewAuditModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate();
  const { projects, loading: loadingProjects } = useProjects();

  const [step, setStep]  = useState(1);
  const [name, setName]  = useState('');
  const [url, setUrl]    = useState('');
  const [pid, setPid]    = useState('');
  const [cats, setCats]  = useState(new Set<ScanCategory>(SCAN_CATEGORIES.map(c => c.id)));
  const [busy, setBusy]  = useState(false);
  const [err,  setErr]   = useState('');

  const toggle = (id: ScanCategory) => {
    const n = new Set(cats);
    n.has(id) ? n.delete(id) : n.add(id);
    setCats(n);
  };

  const launch = async () => {
    if (!name.trim() || !pid) { setErr('Nom et projet requis'); return; }
    if (cats.size === 0) { setErr('Sélectionnez au moins un scanner'); return; }
    setBusy(true); setErr('');
    try {
      const audit = await auditsApi.create({ name: name.trim(), projectId: pid, scanCategories: Array.from(cats), targetUrl: url.trim() || undefined });
      await auditsApi.run(audit.id);
      onCreated();
      navigate(`/audits/${audit.id}`);
    } catch (e: unknown) {
      const ae = e as { response?: { data?: { message?: string } } };
      setErr(ae?.response?.data?.message ?? "Impossible de créer l'audit");
    } finally { setBusy(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg gp-glass p-7"
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${A}18`, border: `1px solid ${A}30` }}>
              <Zap size={14} style={{ color: A }} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>Nouvel audit</h2>
              <p className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>Étape {step} / 2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--gp-t3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ backgroundColor: s <= step ? A : 'var(--gp-b1)' }} />
          ))}
        </div>

        {step === 1 && (
          <motion.div className="space-y-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            {[
              { label: 'Nom de l\'audit *', value: name, set: setName, type: 'text', ph: 'Audit mai 2025 — Production' },
              { label: 'URL cible', value: url, set: setUrl, type: 'url', ph: 'https://app.monprojet.io' },
            ].map(f => (
              <div key={f.label}>
                <label className="gp-label block mb-2">{f.label}</label>
                <input
                  type={f.type} value={f.value} placeholder={f.ph}
                  onChange={e => f.set(e.target.value)}
                  className="gp-input"
                />
              </div>
            ))}
            <div>
              <label className="gp-label block mb-2">Projet *</label>
              {loadingProjects ? (
                <div className="h-11 rounded-lg shimmer" />
              ) : projects.length === 0 ? (
                <div className="rounded-lg px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c' }}>
                  Aucun projet. Créez-en un d'abord.
                </div>
              ) : (
                <select
                  value={pid} onChange={e => setPid(e.target.value)}
                  className="gp-input"
                  style={{ appearance: 'none' }}
                >
                  <option value="">Sélectionner un projet...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            {err && <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}>{err}</p>}
            <button
              onClick={() => {
                if (!name.trim()) { setErr('Nom requis'); return; }
                if (!pid && projects.length > 0) { setErr('Projet requis'); return; }
                setErr(''); setStep(2);
              }}
              disabled={projects.length === 0}
              className="gp-btn gp-btn-primary w-full justify-center disabled:opacity-40"
            >
              Suivant →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div className="space-y-4" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div>
              <label className="gp-label block mb-3">Scanners actifs</label>
              <div className="grid grid-cols-2 gap-2">
                {SCAN_CATEGORIES.map(cat => {
                  const active = cats.has(cat.id);
                  return (
                    <button
                      key={cat.id} onClick={() => toggle(cat.id)}
                      className="text-left p-3 rounded-xl text-sm transition-all"
                      style={{
                        backgroundColor: active ? `${A}0c` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${active ? `${A}35` : 'var(--gp-b1)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="font-semibold text-[12px]" style={{ color: active ? 'var(--gp-t1)' : 'var(--gp-t2)' }}>{cat.label}</span>
                      </div>
                      <div className="text-[10px] pl-6" style={{ color: 'var(--gp-t3)' }}>{cat.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            {err && <p className="text-xs" style={{ color: '#f87171' }}>{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="gp-btn gp-btn-ghost flex-1 justify-center"
              >
                ← Retour
              </button>
              <button
                onClick={launch} disabled={busy || cats.size === 0}
                className="gp-btn gp-btn-primary flex-1 justify-center disabled:opacity-40"
              >
                {busy ? <><Loader2 size={13} className="animate-spin" /> Création...</> : <><Play size={13} /> Lancer</>}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AuditsPage() {
  const { audits, total, loading, error, refresh, deleteAudit } = useAudits();
  const [showModal,  setShowModal]  = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setDeletingId(id);
    await deleteAudit(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>Audits</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--gp-t3)' }}>
            {loading ? '—' : `${total} audit${total !== 1 ? 's' : ''} enregistré${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--gp-s1)', border: '1px solid var(--gp-b1)', color: 'var(--gp-t3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gp-b2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gp-b1)'; }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="gp-btn gp-btn-primary"
          >
            <Plus size={14} /> Nouvel audit
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading ? (
        <div className="gp-card rounded-2xl overflow-hidden">
          {[1,2,3,4,5].map((i, idx) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: idx < 4 ? '1px solid var(--gp-b1)' : 'none' }}>
              <div className="w-2 h-2 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded-lg w-48 shimmer" />
                <div className="h-2.5 rounded w-28 shimmer" />
              </div>
              <div className="h-3 w-12 rounded shimmer" />
            </div>
          ))}
        </div>
      ) : audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: `linear-gradient(135deg, ${A}10 0%, rgba(56,189,248,0.05) 100%)`, border: `1px solid ${A}20` }}
          >
            <Play size={22} style={{ color: A }} />
          </div>
          <p className="text-base font-bold mb-2" style={{ color: 'var(--gp-t1)' }}>Aucun audit</p>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--gp-t3)' }}>
            Lancez votre premier audit Green IT pour analyser l'empreinte carbone de votre application.
          </p>
          <button onClick={() => setShowModal(true)} className="gp-btn gp-btn-primary">
            <Plus size={14} /> Lancer un audit
          </button>
        </div>
      ) : (
        <div className="gp-card rounded-2xl overflow-hidden">
          {audits.map((audit, idx) => {
            const cfg   = STATUS[audit.status] ?? STATUS.pending;
            const score = audit.scoreGlobal ?? 0;
            const sc    = score > 0 ? getScoreColor(score) : 'var(--gp-t3)';
            const isLast = idx === audits.length - 1;
            return (
              <Link key={audit.id} to={`/audits/${audit.id}`} className="block">
                <motion.div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer group"
                  style={{ borderBottom: isLast ? 'none' : '1px solid var(--gp-b1)' }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                  transition={{ duration: 0.1 }}
                >
                  {/* Status pill */}
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color, boxShadow: `0 0 6px ${cfg.color}80` }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--gp-t1)' }}>{audit.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        {cfg.spin && <Loader2 size={8} className="inline animate-spin mr-1" />}
                        {cfg.label}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>{formatRelativeDate(audit.createdAt)}</span>
                      {audit.durationMs && audit.durationMs > 0 && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--gp-t3)' }}>
                          <Clock size={10} />{formatDuration(audit.durationMs)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  {score > 0 && (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <div
                        className="px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums"
                        style={{ backgroundColor: `${sc}12`, color: sc, border: `1px solid ${sc}25` }}
                      >
                        {score}
                      </div>
                      <span className="text-[11px] font-medium" style={{ color: sc }}>{getScoreLabel(score)}</span>
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    onClick={e => handleDelete(e, audit.id)} disabled={deletingId === audit.id}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ color: 'var(--gp-t3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; }}
                  >
                    {deletingId === audit.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>

                  <ChevronRight size={13} style={{ color: 'var(--gp-b2)' }} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && <NewAuditModal onClose={() => setShowModal(false)} onCreated={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
