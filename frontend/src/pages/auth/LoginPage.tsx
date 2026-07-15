import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [npoMceId, setNpoMceId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowForm(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(npoMceId, password);
      const freshUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      navigate(freshUser.role === 'superadmin' || freshUser.role === 'UH' ? '/admin/dashboard' : '/marketing/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 429) {
        setError('Terlalu banyak percobaan, coba lagi 1 menit');
      } else {
        setError(axiosErr?.response?.data?.message || 'Login gagal');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-fif-950 to-slate-950 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 animate-float rounded-full bg-fif-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 animate-float rounded-full bg-purple-500/10 blur-3xl" style={{ animationDelay: '-3s' }} />
      <div className="pointer-events-none absolute left-1/3 top-1/3 h-48 w-48 animate-float rounded-full bg-emerald-500/5 blur-3xl" style={{ animationDelay: '-1.5s' }} />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fif-500/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-transparent" />

      <div className="relative flex flex-col items-center gap-10">
        <div className="animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 animate-spin-slow rounded-full bg-gradient-to-r from-fif-500/20 via-purple-500/20 to-fif-500/20 blur-xl" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-fif-500/20 to-fif-700/20 ring-1 ring-white/10 backdrop-blur-xl">
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-fif-500/10 to-transparent ring-1 ring-white/5" />
              <img src="/logo.png" alt="FIF" className="relative h-16 w-16 object-contain drop-shadow-lg" />
            </div>
            <div className="absolute -bottom-1 left-1/2 h-px w-20 -translate-x-1/2 bg-gradient-to-r from-transparent via-fif-500/40 to-transparent" />
          </div>
        </div>

        <div className={`text-center transition-all duration-700 ${showForm ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h1 className="font-heading bg-gradient-to-r from-white via-fif-100 to-fif-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            Selamat Datang
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">Federal International Finance</p>
        </div>

        <form
          method="post"
          onSubmit={handleSubmit}
          className={`w-full max-w-sm space-y-4 transition-all duration-700 delay-150 ${showForm ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="relative">
            <Fingerprint className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="username"
              value={npoMceId}
              onChange={(e) => setNpoMceId(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none backdrop-blur-sm transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
              placeholder="ID NPO / MCE atau Email"
              spellCheck={false}
            />
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none backdrop-blur-sm transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
              placeholder="Password"
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-gradient-to-r from-fif-600 to-fif-500 shadow-lg shadow-fif-600/25 hover:from-fif-700 hover:to-fif-600 hover:shadow-xl hover:shadow-fif-600/30"
            size="lg"
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </Button>

          <p className="pt-2 text-center text-sm text-slate-600">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-fif-400 transition-all hover:text-fif-300 hover:underline underline-offset-2">
              Daftar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
