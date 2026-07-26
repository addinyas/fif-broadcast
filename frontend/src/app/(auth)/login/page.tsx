'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Fingerprint, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

/* ── Animated particle ───────────────────────────────── */
function Particle({ delay }: { delay: number }) {
  const size = Math.random() * 4 + 2;
  const left = Math.random() * 100;
  const dur = Math.random() * 8 + 6;
  return (
    <motion.div
      className="absolute rounded-full bg-blue-400/30"
      style={{ width: size, height: size, left: `${left}%`, bottom: '-10px' }}
      animate={{ y: [0, -(Math.random() * 300 + 200)], opacity: [0, 0.7, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

/* ── Input field ─────────────────────────────────────── */
function InputField({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  name,
  autoComplete,
  rightSlot,
}: {
  icon: React.ElementType;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  name: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className="relative"
      animate={{ scale: focused ? 1.01 : 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow ring when focused */}
      <AnimatePresence>
        {focused && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ boxShadow: '0 0 0 2px rgba(96,165,250,0.4), 0 0 20px rgba(59,130,246,0.15)' }}
          />
        )}
      </AnimatePresence>

      <Icon
        className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ${focused ? 'text-blue-400' : 'text-slate-600'}`}
      />
      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        autoComplete={autoComplete}
        spellCheck={false}
        placeholder={placeholder}
        className={`
          w-full rounded-xl py-3.5 pl-11 text-sm text-white outline-none
          placeholder:text-slate-600
          transition-all duration-200
          ${rightSlot ? 'pr-11' : 'pr-4'}
        `}
        style={{
          background: focused ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`,
        }}
      />
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </motion.div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [npoMceId, setNpoMceId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const particles = useRef(Array.from({ length: 18 }, (_, i) => i));

  useEffect(() => {
    const t = setTimeout(() => setShowForm(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(npoMceId, password);
      const freshUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      router.replace(
        freshUser.role === 'superadmin' || freshUser.role === 'UH'
          ? '/admin/dashboard'
          : '/marketing/dashboard'
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      setError(
        axiosErr?.response?.status === 429
          ? 'Terlalu banyak percobaan, coba lagi 1 menit'
          : axiosErr?.response?.data?.message || 'Login gagal, periksa ID dan password'
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: 'linear-gradient(135deg, #060d1a 0%, #0c1629 50%, #0a1020 100%)' }}
    >
      {/* ── Particles ────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.current.map((i) => (
          <Particle key={i} delay={i * 0.4} />
        ))}
      </div>

      {/* ── Ambient orbs ─────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-3xl"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      {/* ── Grid overlay ─────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Card container ───────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Logo section ─────────────────── */}
        <div className="mb-10 flex flex-col items-center">
          {/* Logo wrapper — unchanged size & position per user request */}
          <motion.div
            className="relative mb-6"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Rotating glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, rgba(59,130,246,0.5), rgba(139,92,246,0.5), rgba(59,130,246,0.5))',
                filter: 'blur(6px)',
                borderRadius: '50%',
                padding: '2px',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
            {/* Logo container */}
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-full ring-1 ring-white/10"
              style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)' }}
            >
              <div className="absolute inset-2 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)' }} />
              {/* Logo — ukuran dan posisi tidak diubah */}
              <img
                src="/logofif.png"
                alt="FIF"
                className="relative h-16 w-16 object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: showForm ? 1 : 0, y: showForm ? 0 : 10 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <h1 className="font-heading text-2xl font-bold tracking-tight"
              style={{ background: 'linear-gradient(135deg, #ffffff, #93c5fd, #c4b5fd)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Selamat Datang
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">Federal International Finance</p>
          </motion.div>
        </div>

        {/* ── Form card ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showForm ? 1 : 0, y: showForm ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Inner top highlight */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ID Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                ID NPO / MCE
              </label>
              <InputField
                icon={Fingerprint}
                type="text"
                name="username"
                value={npoMceId}
                onChange={setNpoMceId}
                placeholder="Masukkan ID NPO atau Email"
                autoComplete="username"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <InputField
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={setPassword}
                placeholder="Masukkan password"
                autoComplete="current-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            {/* Submit */}
            <div className="pt-1">
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                loading={loading}
                glow
                className="w-full"
                icon={<LogIn className="h-4 w-4" />}
              >
                {loading ? 'Sedang masuk...' : 'Masuk'}
              </Button>
            </div>

            {/* Register link */}
            <p className="pt-1 text-center text-sm text-slate-600">
              Belum punya akun?{' '}
              <Link
                href="/register"
                className="font-semibold text-blue-400 transition-colors hover:text-blue-300 hover:underline underline-offset-2"
              >
                Daftar
              </Link>
            </p>
          </form>
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          className="mt-6 text-center text-[11px] text-slate-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: showForm ? 1 : 0 }}
          transition={{ delay: 0.6 }}
        >
          © {new Date().getFullYear()} FIF Broadcast System · Secure Login
        </motion.p>
      </motion.div>
    </div>
  );
}
