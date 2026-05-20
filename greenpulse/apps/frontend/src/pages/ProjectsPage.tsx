import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Folder, Globe, Tag, Pencil, Trash2, X, Loader2,
  AlertTriangle, RefreshCw, CheckCircle2, FolderOpen,
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { formatRelativeDate } from '../utils/formatters';
import type { Project } from '../types';
import type { CreateProjectDto, UpdateProjectDto } from '../api/projects.api';

const A = '#22d3a5';

const ENV: Record<string, { label: string; color: string }> = {
  production: { label: 'Production', color: '#f87171' },
  staging:    { label: 'Staging',    color: '#fbbf24' },
  dev:        { label: 'Dev',        color: '#60a5fa' },
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function ProjectModal({ project, onClose, onSave }: {
  project?: Project;
  onClose: () => void;
  onSave: (dto: CreateProjectDto | UpdateProjectDto) => Promise<void>;
}) {
  const [name, setName]     = useState(project?.name ?? '');
  const [desc, setDesc]     = useState(project?.description ?? '');
  const [url, setUrl]       = useState(project?.url ?? '');
  const [env, setEnv]       = useState<'production'|'staging'|'dev'>(project?.environment ?? 'production');
  const [tags, setTags]     = useState(project?.tags?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Le nom est obligatoire'); return; }
    setSaving(true); setError(null);
    try {
      await onSave({ name: name.trim(), description: desc.trim() || undefined, url: url.trim() || undefined, environment: env, tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
      onClose();
    } catch { setError('Une erreur est survenue'); }
    finally { setSaving(false); }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
              <FolderOpen size={14} style={{ color: A }} />
            </div>
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>
              {project ? 'Modifier le projet' : 'Nouveau projet'}
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

        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'Nom *', val: name, set: setName, type: 'text', ph: 'Mon Application Web' },
            { label: 'Description', val: desc, set: setDesc, type: 'text', ph: 'Description optionnelle' },
            { label: 'URL cible', val: url, set: setUrl, type: 'url', ph: 'https://mon-app.com' },
          ].map(f => (
            <div key={f.label}>
              <label className="gp-label block mb-2">{f.label}</label>
              <input
                type={f.type} value={f.val} placeholder={f.ph}
                onChange={e => f.set(e.target.value)}
                className="gp-input"
              />
            </div>
          ))}

          <div>
            <label className="gp-label block mb-2">Environnement</label>
            <div className="flex gap-2">
              {(['production', 'staging', 'dev'] as const).map(e => (
                <button key={e} type="button" onClick={() => setEnv(e)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    backgroundColor: env === e ? `${ENV[e].color}12` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${env === e ? `${ENV[e].color}35` : 'var(--gp-b1)'}`,
                    color: env === e ? ENV[e].color : 'var(--gp-t3)',
                  }}
                >
                  {ENV[e].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="gp-label block mb-2">Tags</label>
            <input
              className="gp-input" placeholder="react, nestjs, aws"
              value={tags} onChange={e => setTags(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: '#f87171' }}>
              <AlertTriangle size={12} /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="gp-btn gp-btn-ghost flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="gp-btn gp-btn-primary flex-1 justify-center disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {project ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { projects, total, loading, error, refresh, createProject, updateProject, deleteProject } = useProjects();
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Project|null>(null);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [search,     setSearch]     = useState('');

  const filtered = search.trim()
    ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
    : projects;

  async function handleSave(dto: CreateProjectDto | UpdateProjectDto) {
    if (editTarget) await updateProject(editTarget.id, dto as UpdateProjectDto);
    else await createProject(dto as CreateProjectDto);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce projet ? Irréversible.')) return;
    setDeletingId(id);
    await deleteProject(id);
    setDeletingId(null);
  }

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease_both]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>Projets</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--gp-t3)' }}>
            {total} projet{total !== 1 ? 's' : ''}
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
            onClick={() => { setEditTarget(null); setShowModal(true); }}
            className="gp-btn gp-btn-primary"
          >
            <Plus size={14} /> Nouveau projet
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          className="gp-input pl-10"
          placeholder="Rechercher un projet…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--gp-t3)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && projects.length === 0 && (
        <div className="gp-card rounded-2xl overflow-hidden">
          {[1,2,3].map((i, idx) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: idx < 2 ? '1px solid var(--gp-b1)' : 'none' }}>
              <div className="w-8 h-8 rounded-xl shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded w-36 shimmer" />
                <div className="h-2.5 rounded w-24 shimmer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: `linear-gradient(135deg, ${A}10 0%, rgba(56,189,248,0.05) 100%)`, border: `1px solid ${A}20` }}
          >
            <Folder size={22} style={{ color: A }} />
          </div>
          <p className="text-base font-bold mb-2" style={{ color: 'var(--gp-t1)' }}>
            {search ? 'Aucun résultat' : 'Aucun projet'}
          </p>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--gp-t3)' }}>
            {search ? 'Essayez un autre terme de recherche' : 'Créez votre premier projet pour commencer les audits Green IT'}
          </p>
          {!search && (
            <button
              onClick={() => { setEditTarget(null); setShowModal(true); }}
              className="gp-btn gp-btn-primary"
            >
              <Plus size={14} /> Créer un projet
            </button>
          )}
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="gp-card rounded-2xl overflow-hidden">
          {filtered.map((project, idx) => {
            const envCfg = project.environment ? ENV[project.environment] : null;
            const isLast = idx === filtered.length - 1;
            return (
              <motion.div
                key={project.id}
                className="flex items-center gap-4 px-5 py-4 group"
                style={{ borderBottom: isLast ? 'none' : '1px solid var(--gp-b1)' }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
                transition={{ duration: 0.1 }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${A}0c`, border: `1px solid ${A}20` }}
                >
                  <Folder size={14} style={{ color: A }} />
                </div>

                {/* Name + desc */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--gp-t1)' }}>{project.name}</p>
                  {project.description && (
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--gp-t3)' }}>{project.description}</p>
                  )}
                </div>

                {/* URL */}
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hidden md:flex items-center gap-1.5 text-[11px] max-w-[160px] truncate transition-colors"
                    style={{ color: 'var(--gp-t3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gp-t1)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--gp-t3)')}
                  >
                    <Globe size={11} />{project.url.replace(/^https?:\/\//, '')}
                  </a>
                )}

                {/* Env + Tags */}
                <div className="flex items-center gap-2 shrink-0">
                  {envCfg && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${envCfg.color}12`, border: `1px solid ${envCfg.color}25`, color: envCfg.color }}
                    >
                      {envCfg.label}
                    </span>
                  )}
                  {project.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="hidden sm:flex items-center gap-1 text-[10px]" style={{ color: 'var(--gp-t3)' }}>
                      <Tag size={9} />{tag}
                    </span>
                  ))}
                </div>

                {/* Date */}
                <span className="hidden lg:block text-[11px] w-20 text-right shrink-0" style={{ color: 'var(--gp-t3)' }}>
                  {formatRelativeDate(project.createdAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { setEditTarget(project); setShowModal(true); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ color: 'var(--gp-t3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)} disabled={deletingId === project.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                    style={{ color: 'var(--gp-t3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; }}
                  >
                    {deletingId === project.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <ProjectModal
            project={editTarget ?? undefined}
            onClose={() => { setShowModal(false); setEditTarget(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
