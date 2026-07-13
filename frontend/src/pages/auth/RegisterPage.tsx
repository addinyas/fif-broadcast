import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Fingerprint, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import type { Kios } from '../../types';

export function RegisterPage() {
  const { register } = useAuth();
  const [kiosList, setKiosList] = useState<Kios[]>([]);
  const [selectedKiosId, setSelectedKiosId] = useState('');
  const [kiosName, setKiosName] = useState('');
  const [name, setName] = useState('');
  const [npoMceId, setNpoMceId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authService.getKios().then(setKiosList).catch(() => {});
  }, []);

  const handleKiosChange = (kiosId: string) => {
    setSelectedKiosId(kiosId);
    const found = kiosList.find((k) => k.kios_id === kiosId);
    setKiosName(found?.kios_name || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password minimal 8 karakter, harus mengandung huruf besar, huruf kecil, dan angka');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await register({
        name,
        email: email || undefined,
        password,
        gender,
        npo_mce_id: npoMceId,
        kios_id: selectedKiosId,
      });
      window.location.href = '/';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-fif-950 to-slate-950 p-4">
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
          <h1 className="bg-gradient-to-r from-fif-200 via-fif-100 to-white bg-clip-text text-2xl font-bold text-transparent">Buat Akun</h1>
          <p className="mt-1.5 text-sm text-slate-500">Daftar untuk memulai</p>
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-fif-500/30 via-purple-500/30 to-fif-500/30 opacity-0 blur transition-all duration-500 group-hover:opacity-100" />
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-7 backdrop-blur-2xl dark:bg-slate-900/70">
            {error && (
              <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} method="post" autoComplete="off" className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Kios</label>
                <div className="relative">
                  <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select value={selectedKiosId} onChange={(e) => handleKiosChange(e.target.value)} required
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15">
                    <option value="" className="bg-slate-900">Pilih kios...</option>
                    {kiosList.map((k) => (
                      <option key={k.kios_id} value={k.kios_id} className="bg-slate-900">
                        {k.kios_id} - {k.kios_name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.kios_id && <p className="text-xs text-red-400">{errors.kios_id}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Nama Kios</label>
                <div className="relative">
                  <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={kiosName} readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] py-2.5 pl-10 pr-3 text-sm text-slate-500 outline-none"
                    placeholder="Otomatis terisi" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Nama</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white uppercase outline-none transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
                    placeholder="Nama lengkap"
                    autoComplete="off"
                    spellCheck={false} />
                </div>
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">ID NPO/MCE</label>
                <div className="relative">
                  <Fingerprint className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={npoMceId} onChange={(e) => setNpoMceId(e.target.value.toUpperCase())} required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
                    placeholder="Masukkan ID NPO atau MCE"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false} />
                </div>
                {errors.npo_mce_id && <p className="text-xs text-red-400">{errors.npo_mce_id}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Email <span className="text-slate-600">(opsional)</span></label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
                    placeholder="nama@email.com" />
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-fif-500/50 focus:bg-fif-500/5 focus:ring-2 focus:ring-fif-500/15"
                    placeholder="Minimal 8 karakter" />
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">Jenis Kelamin</label>
                <div className="flex gap-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400 transition-all hover:bg-white/10 has-checked:border-fif-500/50 has-checked:bg-fif-500/10 has-checked:text-fif-300">
                    <input type="radio" name="gender" value="L" checked={gender === 'L'} onChange={(e) => setGender(e.target.value)} required
                      className="h-4 w-4 accent-fif-500" />
                    Laki-laki
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400 transition-all hover:bg-white/10 has-checked:border-fif-500/50 has-checked:bg-fif-500/10 has-checked:text-fif-300">
                    <input type="radio" name="gender" value="P" checked={gender === 'P'} onChange={(e) => setGender(e.target.value)} required
                      className="h-4 w-4 accent-fif-500" />
                    Perempuan
                  </label>
                </div>
                {errors.gender && <p className="text-xs text-red-400">{errors.gender}</p>}
              </div>

              <Button type="submit" loading={loading} className="w-full bg-gradient-to-r from-fif-600 to-fif-500 hover:from-fif-700 hover:to-fif-600 shadow-lg shadow-fif-600/25 hover:shadow-xl hover:shadow-fif-600/30" size="lg">
                <UserPlus className="h-4 w-4" />
                Daftar
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-medium text-fif-400 transition-all hover:text-fif-300 hover:underline underline-offset-2">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
