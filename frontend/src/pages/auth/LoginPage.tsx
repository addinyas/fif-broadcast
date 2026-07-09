import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const errorParam = params.get('error');

    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      window.location.href = '/';
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError('Fitur login Google masih dalam pengembangan');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-fif-950 to-slate-950 p-4 animate-fade-in">
      {/* Floating decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 animate-float rounded-full bg-fif-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 animate-float rounded-full bg-purple-500/10 blur-3xl" style={{ animationDelay: '-3s' }} />
      <div className="pointer-events-none absolute left-1/3 top-1/3 h-48 w-48 animate-float rounded-full bg-emerald-500/5 blur-3xl" style={{ animationDelay: '-1.5s' }} />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fif-500/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/15 via-transparent to-transparent" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-fif-500 to-fif-700 shadow-lg shadow-fif-500/25 ring-1 ring-white/10">
            <img src="/logo.png" alt="FIF" className="h-12 w-12 object-contain drop-shadow-lg" />
          </div>
          <h1 className="bg-gradient-to-r from-white via-fif-100 to-fif-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent drop-shadow-sm">Selamat Datang</h1>
          <p className="mt-1.5 text-sm text-slate-500">Federal International Finance</p>
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-fif-500/30 via-purple-500/30 to-fif-500/30 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-2xl dark:bg-slate-900/70">
            {error && (
              <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full bg-gradient-to-r from-fif-600 to-fif-500 hover:from-fif-700 hover:to-fif-600 shadow-lg shadow-fif-600/25 hover:shadow-xl hover:shadow-fif-600/30" size="lg">
                <LogIn className="h-4 w-4" />
                Masuk
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-xs text-slate-600">atau</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <Button variant="secondary" onClick={handleGoogle} className="w-full border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Masuk dengan Google
            </Button>

            <p className="mt-6 text-center text-sm text-slate-600">
              Belum punya akun?{' '}
              <Link to="/register" className="font-medium text-fif-400 transition-all hover:text-fif-300 hover:underline underline-offset-2">
                Daftar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
