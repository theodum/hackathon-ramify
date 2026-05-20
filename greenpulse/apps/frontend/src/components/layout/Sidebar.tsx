import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileText, Settings, Leaf, Folder, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const NAV_MAIN = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',  icon: Folder,          label: 'Projets' },
  { to: '/audits',    icon: ClipboardList,   label: 'Audits' },
  { to: '/reports',   icon: FileText,        label: 'Rapports' },
];
const NAV_BOTTOM = [
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

const A = '#22d3a5';

export function Sidebar() {
  const loc      = useLocation();
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const logout   = useAuthStore(s => s.logout);

  const isActive = (to: string) => loc.pathname.startsWith(to);

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => {
    const active = isActive(to);
    return (
      <NavLink to={to} className="block">
        <div
          className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none transition-all duration-150"
          style={{
            backgroundColor: active ? `${A}10` : 'transparent',
            color: active ? '#f0fdf9' : 'var(--gp-t3)',
          }}
          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
        >
          {active && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
              style={{ height: 20, backgroundColor: A, boxShadow: `0 0 8px ${A}90` }}
            />
          )}
          <Icon
            size={16}
            style={{ color: active ? A : 'currentColor', flexShrink: 0, transition: 'color 0.15s' }}
          />
          <span className="text-sm font-medium tracking-[-0.01em]">{label}</span>
          {active && (
            <span
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${A}08 0%, transparent 60%)` }}
            />
          )}
        </div>
      </NavLink>
    );
  };

  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || 'GP';

  return (
    <aside
      className="w-[258px] shrink-0 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a2e2a 0%, #1e3830 50%, #162820 100%)',
        borderRight: '1px solid rgba(0,0,0,0.12)',
      }}
    >
      {/* Logo */}
      <div className="h-[64px] flex items-center gap-3 px-5 shrink-0" style={{ borderBottom: '1px solid var(--gp-b1)' }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${A}28 0%, ${A}0a 100%)`,
            border: `1px solid ${A}35`,
            boxShadow: `0 0 16px ${A}20`,
          }}
        >
          <Leaf size={15} style={{ color: A }} />
        </div>
        <div>
          <p className="text-[13px] font-bold tracking-[-0.02em]" style={{ color: 'var(--gp-t1)' }}>
            GreenPulse
          </p>
          <p className="text-[10px] font-medium" style={{ color: 'var(--gp-t3)' }}>
            Green IT Platform
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        <p className="gp-label px-3 pt-2 pb-2 mt-1">Navigation</p>
        {NAV_MAIN.map(item => <NavItem key={item.to} {...item} />)}

        <div className="mt-auto pt-4">
          <p className="gp-label px-3 pb-2">Compte</p>
          {NAV_BOTTOM.map(item => <NavItem key={item.to} {...item} />)}
        </div>
      </nav>

      {/* REEN badge */}
      <div
        className="mx-3 mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all duration-150"
        style={{
          background: `linear-gradient(135deg, ${A}0c 0%, rgba(56,189,248,0.05) 100%)`,
          border: `1px solid ${A}22`,
        }}
        onClick={() => navigate('/reports')}
        onMouseEnter={e => (e.currentTarget.style.borderColor = `${A}40`)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = `${A}22`)}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${A}18` }}>
          <Zap size={11} style={{ color: A }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: A }}>Conformité REEN</p>
          <p className="text-[10px]" style={{ color: 'var(--gp-t3)' }}>3/5 obligations validées</p>
        </div>
      </div>

      {/* User */}
      <div
        className="mx-3 mb-3 p-3 rounded-xl flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--gp-b1)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
          style={{
            background: `linear-gradient(135deg, ${A}30, rgba(56,189,248,0.2))`,
            color: A,
            boxShadow: `0 0 12px ${A}20`,
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--gp-t1)' }}>
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-[10px] truncate" style={{ color: 'var(--gp-t3)' }}>{user?.email}</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0"
          style={{ color: 'var(--gp-t3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)'; }}
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
}
