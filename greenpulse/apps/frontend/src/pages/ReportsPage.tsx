import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, FileJson, Table, Leaf, ExternalLink,
  Plus, Loader2, RefreshCw, X, AlertTriangle, Zap,
} from 'lucide-react';
import { type Report, type ReportFormat, type Audit } from '../types';
import { reportsApi } from '../api/reports.api';
import { auditsApi } from '../api/audits.api';
import { formatRelativeDate, formatFileSize } from '../utils/formatters';

const A = '#22d3a5';

const FORMAT_CFG: Record<ReportFormat, { icon: React.ElementType; label: string; color: string }> = {
  pdf:  { icon: FileText,     label: 'PDF',  color: '#f87171' },
  json: { icon: FileJson,     label: 'JSON', color: '#60a5fa' },
  csv:  { icon: Table,        label: 'CSV',  color: A },
  html: { icon: ExternalLink, label: 'HTML', color: '#a78bfa' },
};

// ─── Generate Modal ───────────────────────────────────────────────────────────

function GenerateModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const [audits,        setAudits]        = useState<Audit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [auditId,       setAuditId]       = useState('');
  const [format,        setFormat]        = useState<ReportFormat>('pdf');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    auditsApi.list({ limit: 50 })
      .then(r => { setAudits(r.data); if (r.data.length > 0) setAuditId(r.data[0].id); })
      .catch(() => {})
      .finally(() => setLoadingAudits(false));
  }, []);

  const handleGenerate = async () => {
    if (!auditId) { setError('Sélectionnez un audit'); return; }
    setSubmitting(true); setError('');
    try {
      await reportsApi.generate({ auditId, format });
      onGenerated(); onClose();
    } catch (err: unknown) {
      const ae = err as { response?: { data?: { message?: string } } };
      setError(ae?.response?.data?.message ?? 'Impossible de générer le rapport');
    } finally { setSubmitting(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md gp-glass p-7"
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
              <FileText size={14} style={{ color: A }} />
            </div>
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>
              Générer un rapport
            </h2>
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

        <div className="space-y-5">
          <div>
            <label className="gp-label block mb-2">Audit source *</label>
            {loadingAudits ? (
              <div className="h-11 rounded-lg shimmer" />
            ) : audits.length === 0 ? (
              <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c' }}>
                Aucun audit disponible. Créez et lancez un audit d'abord.
              </div>
            ) : (
              <select
                value={auditId} onChange={e => setAuditId(e.target.value)}
                className="gp-input"
                style={{ appearance: 'none' }}
              >
                {audits.map(a => {
                  const emoji = a.status === 'completed' ? '✓' : a.status === 'failed' ? '✗' : a.status === 'running' ? '…' : '○';
                  return <option key={a.id} value={a.id}>{emoji} {a.name}</option>;
                })}
              </select>
            )}
          </div>

          <div>
            <label className="gp-label block mb-2">Format *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['pdf', 'csv', 'json', 'html'] as ReportFormat[]).map(f => {
                const cfg = FORMAT_CFG[f];
                const active = format === f;
                return (
                  <button key={f} onClick={() => setFormat(f)}
                    className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: active ? `${cfg.color}0f` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${active ? `${cfg.color}35` : 'var(--gp-b1)'}`,
                    }}
                  >
                    <cfg.icon size={14} style={{ color: cfg.color }} />
                    <span className="font-semibold text-[12px]" style={{ color: active ? 'var(--gp-t1)' : 'var(--gp-t2)' }}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}><AlertTriangle size={12} />{error}</p>}

          <button
            onClick={handleGenerate} disabled={submitting || audits.length === 0}
            className="gp-btn gp-btn-primary w-full justify-center disabled:opacity-40"
          >
            {submitting
              ? <><Loader2 size={13} className="animate-spin" /> Génération...</>
              : <><FileText size={13} /> Générer le rapport</>
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [reports,     setReports]     = useState<Report[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [downloading, setDownloading] = useState<string|null>(null);

  const fetchReports = async () => {
    setLoading(true); setError('');
    try {
      const r = await reportsApi.list({ limit: 50 });
      setReports(r.data); setTotal(r.total);
    } catch (err: unknown) {
      const ae = err as { response?: { data?: { message?: string } } };
      setError(ae?.response?.data?.message ?? 'Impossible de charger les rapports');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDownload = async (report: Report) => {
    setDownloading(report.id);
    try {
      if (report.format === 'pdf') {
        reportsApi.triggerDownload(await reportsApi.downloadPdf(report.id), `rapport-${report.id}.pdf`);
      } else if (report.format === 'csv') {
        reportsApi.triggerDownload(await reportsApi.downloadCsv(report.id), `rapport-${report.id}.csv`);
      }
    } catch { /* silent */ }
    finally { setDownloading(null); }
  };

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>Rapports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--gp-t3)' }}>
            {loading ? '—' : `${total} rapport${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'var(--gp-s1)', border: '1px solid var(--gp-b1)', color: 'var(--gp-t3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gp-b2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gp-b1)'; }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowModal(true)} className="gp-btn gp-btn-primary">
            <Plus size={14} /> Générer un rapport
          </button>
        </div>
      </div>

      {/* REEN compliance banner */}
      <motion.div
        className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${A}08 0%, rgba(56,189,248,0.05) 100%)`,
          border: `1px solid ${A}18`,
        }}
        whileHover={{ borderColor: `${A}35` }}
        transition={{ duration: 0.15 }}
        onClick={() => setShowModal(true)}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${A}12`, border: `1px solid ${A}25` }}
        >
          <Leaf size={18} style={{ color: A }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold" style={{ color: 'var(--gp-t1)' }}>Conformité REEN 2021</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: `${A}15`, color: A }}>3/5</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--gp-t3)' }}>
            Générez un rapport PDF complet pour démontrer votre conformité à la loi REEN.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0" style={{ background: `${A}12`, border: `1px solid ${A}25`, color: A }}>
          <Zap size={11} /> Générer
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Skeleton */}
      {loading ? (
        <div className="gp-card rounded-2xl overflow-hidden">
          {[1,2,3].map((i, idx) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: idx < 2 ? '1px solid var(--gp-b1)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded w-40 shimmer" />
                <div className="h-2.5 rounded w-28 shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: `linear-gradient(135deg, ${A}10 0%, rgba(56,189,248,0.05) 100%)`, border: `1px solid ${A}20` }}
          >
            <FileText size={22} style={{ color: A }} />
          </div>
          <p className="text-base font-bold mb-2" style={{ color: 'var(--gp-t1)' }}>Aucun rapport</p>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--gp-t3)' }}>
            Générez votre premier rapport à partir d'un audit terminé.
          </p>
          <button onClick={() => setShowModal(true)} className="gp-btn gp-btn-primary">
            <Plus size={14} /> Générer un rapport
          </button>
        </div>
      ) : (
        <div className="gp-card rounded-2xl overflow-hidden">
          {reports.map((report, idx) => {
            const cfg = FORMAT_CFG[report.format] ?? FORMAT_CFG.pdf;
            const isLast = idx === reports.length - 1;
            return (
              <motion.div
                key={report.id}
                className="flex items-center gap-4 px-5 py-4"
                style={{ borderBottom: isLast ? 'none' : '1px solid var(--gp-b1)' }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                transition={{ duration: 0.1 }}
              >
                {/* Format icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cfg.color}10`, border: `1px solid ${cfg.color}20` }}
                >
                  <cfg.icon size={15} style={{ color: cfg.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--gp-t1)' }}>
                    Rapport — {report.auditId.slice(0, 8)}…
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: `${cfg.color}12`, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    {report.fileSizeBytes && report.fileSizeBytes > 0 && (
                      <span className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>{formatFileSize(report.fileSizeBytes)}</span>
                    )}
                    <span className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>{formatRelativeDate(report.createdAt)}</span>
                    <span className="text-[11px]" style={{ color: 'var(--gp-t3)' }}>{report.downloadCount} dl</span>
                  </div>
                </div>

                {/* Download */}
                {(report.format === 'pdf' || report.format === 'csv') && (
                  <button
                    onClick={() => handleDownload(report)} disabled={downloading === report.id}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--gp-b1)', color: 'var(--gp-t2)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gp-b2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gp-b1)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t2)'; }}
                  >
                    {downloading === report.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Télécharger
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && <GenerateModal onClose={() => setShowModal(false)} onGenerated={fetchReports} />}
      </AnimatePresence>
    </div>
  );
}
