import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth.api';

const A = '#22d3a5';

export function LoginPage() {
  const navigate  = useNavigate();
  const login     = useAuthStore(s => s.login);
  const [email,   setEmail]   = useState('admin@greenpulse.io');
  const [pwd,     setPwd]     = useState('Admin123!');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authApi.login({ email, password: pwd });
      login(res.user, { accessToken: res.accessToken, refreshToken: res.refreshToken, expiresIn: 604800 });
      navigate('/dashboard');
    } catch (err: unknown) {
      const ae = err as { response?: { data?: { message?: string } } };
      setError(ae?.response?.data?.message ?? 'Email ou mot de passe incorrect');
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--gp-bg)' }}
    >
      {/* Background glow orbs */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${A}06 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative z-10 animate-[slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${A}22 0%, ${A}08 100%)`,
              border: `1px solid ${A}35`,
              boxShadow: `0 0 32px ${A}18`,
            }}
          >
            <Leaf size={22} style={{ color: A }} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>GreenPulse</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--gp-t3)' }}>Green IT Audit Platform</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: 'linear-gradient(180deg, var(--gp-s1) 0%, rgba(13,13,20,0.95) 100%)',
            border: '1px solid var(--gp-b1)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div>
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--gp-t1)' }}>Connexion</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--gp-t3)' }}>Accédez à votre tableau de bord</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="gp-label block mb-2">Adresse email</label>
              <input
                type="email" value={email} placeholder="vous@entreprise.fr" required
                onChange={e => setEmail(e.target.value)}
                className="gp-input"
              />
            </div>

            <div>
              <label className="gp-label block mb-2">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={pwd} placeholder="••••••••" required
                  onChange={e => setPwd(e.target.value)}
                  className="gp-input pr-11"
                />
                <button
                  type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--gp-t3)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t2)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--gp-t3)')}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-2.5 text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="gp-btn gp-btn-primary w-full justify-center disabled:opacity-50 mt-1"
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Connexion en cours...</>
                : 'Se connecter →'
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--gp-b1)' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={10} style={{ color: A }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--gp-t3)' }}>Accès démo</p>
            </div>
            <p className="text-[11px] font-mono" style={{ color: 'var(--gp-t2)' }}>
              <span style={{ color: 'var(--gp-t3)' }}>email    </span>admin@greenpulse.io
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--gp-t2)' }}>
              <span style={{ color: 'var(--gp-t3)' }}>mdp      </span>Admin123!
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] mt-6" style={{ color: 'var(--gp-b2)' }}>
          Conforme à la loi REEN n°2021-1485 · © 2025 GreenPulse
        </p>
      </div>
    </div>
  );
}
