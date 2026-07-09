import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Building2, Fingerprint, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [npoMceId, setNpoMceId] = useState('');
  const [kiosName, setKiosName] = useState('');
  const [kiosId, setKiosId] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});
    setLoading(true);
    try {
      await register({ name, email, password, gender, npo_mce_id: npoMceId, kios_name: kiosName, kios_id: kiosId });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (axiosErr?.response?.data?.errors) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(axiosErr.response.data.errors)) {
          flat[k] = (v as string[])[0];
        }
        setErrors(flat);
      }
      setError(axiosErr?.response?.data?.message || 'Register gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-fif-900 via-fif-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fif-500/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="FIF" className="mx-auto mb-4 h-16 w-16 object-contain drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-white">Buat Akun</h1>
          <p className="mt-1 text-sm text-slate-400">Daftar untuk memulai</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Nama</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  placeholder="Nama lengkap"
                />
              </div>
              {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  placeholder="nama@email.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  placeholder="Minimal 8 karakter"
                />
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Jenis Kelamin</label>
              <div className="flex gap-3">
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300 transition-colors has-checked:border-fif-500 has-checked:bg-fif-500/10">
                  <input
                    type="radio"
                    name="gender"
                    value="L"
                    checked={gender === 'L'}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="h-4 w-4 text-fif-500 accent-fif-500"
                  />
                  Laki-laki
                </label>
                <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300 transition-colors has-checked:border-fif-500 has-checked:bg-fif-500/10">
                  <input
                    type="radio"
                    name="gender"
                    value="P"
                    checked={gender === 'P'}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="h-4 w-4 text-fif-500 accent-fif-500"
                  />
                  Perempuan
                </label>
              </div>
              {errors.gender && <p className="text-xs text-red-400">{errors.gender}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">ID NPO/MCE</label>
              <div className="relative">
                <Fingerprint className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={npoMceId}
                  onChange={(e) => setNpoMceId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  placeholder="Masukkan ID NPO atau MCE"
                />
              </div>
              {errors.npo_mce_id && <p className="text-xs text-red-400">{errors.npo_mce_id}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Nama Kios</label>
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={kiosName}
                  onChange={(e) => setKiosName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  placeholder="Masukkan nama kios"
                />
              </div>
              {errors.kios_name && <p className="text-xs text-red-400">{errors.kios_name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">ID Kios</label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={kiosId}
                  onChange={(e) => setKiosId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
                  placeholder="Masukkan ID kios"
                />
              </div>
              {errors.kios_id && <p className="text-xs text-red-400">{errors.kios_id}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <UserPlus className="h-4 w-4" />
              Daftar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-fif-400 transition-colors hover:text-fif-300">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
