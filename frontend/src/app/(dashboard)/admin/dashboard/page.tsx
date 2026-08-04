'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Send, Clock, CheckCircle2, XCircle, UserCheck,
  TrendingUp, BarChart3, PieChart, RefreshCw, X, Zap, Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { broadcastService } from '@/services/broadcastService';
import { customerService } from '@/services/customerService';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { getSocket } from '@/services/socketService';
import type { BroadcastStats, DistributionReport, DailyBroadcastStats } from '@/types';

const MARKETING_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
];

/* ── Real-time clock ──────────────────────────────────── */
function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ── Greeting section ─────────────────────────────────── */
function Greeting({ onRefresh, loading }: { onRefresh?: () => void; loading?: boolean }) {
  const { user } = useAuth();
  const clock = useClock();
  const hour = parseInt(
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }),
    10,
  );

  let greeting = 'Selamat Malam';
  let greetEmoji = '🌙';
  if (hour >= 4  && hour < 11) { greeting = 'Selamat Pagi';  greetEmoji = '☀️'; }
  else if (hour >= 11 && hour < 15) { greeting = 'Selamat Siang'; greetEmoji = '⛅'; }
  else if (hour >= 15 && hour < 18) { greeting = 'Selamat Sore';  greetEmoji = '🌅'; }

  const roleLabel: Record<string, string> = { superadmin: 'Superadmin', UH: 'Unit Head', AO: 'Area Officer', marketing: 'MCE' };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #1d4ed8 75%, #2563eb 100%)',
        boxShadow: '0 20px 60px rgba(37,99,235,0.25), 0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Background pattern */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Orbs */}
        <motion.div
          className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-blue-400/15 blur-2xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-indigo-500/15 blur-2xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent" />
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">{greetEmoji}</span>
              <p className="text-sm font-medium text-blue-200/80">{greeting}</p>
            </div>
            <h1 className="font-poppins text-2xl font-bold tracking-tight sm:text-3xl">
              {user?.name ?? 'Admin'}
            </h1>
            <p className="mt-1.5 text-sm text-blue-200/60">
              {roleLabel[user?.role ?? ''] ?? user?.role}
              {user?.kios_id ? ` · ${user.kios_id}${user.kios_name ? ` ${user.kios_name}` : ''}` : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Real-time clock */}
            <motion.div
              className="rounded-xl px-3 py-1.5 font-mono text-lg font-bold tabular-nums text-white/90"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {clock}
            </motion.div>

            {/* Refresh button */}
            {onRefresh && (
              <motion.button
                onClick={onRefresh}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                whileTap={{ scale: 0.88, rotate: 180 }}
                transition={{ duration: 0.35 }}
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Progress ring ─────────────────────────────────────── */
function ProgressRing({ value, max, color, label, subLabel }: {
  value: number; max: number; color: string; label: string; subLabel: string;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="4"
            className="text-slate-200 dark:text-slate-700" />
          <motion.circle
            cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-satoshi text-xs font-bold tabular-nums" style={{ color }}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      <p className="text-[10px] text-slate-400">{subLabel}</p>
    </div>
  );
}

/* ── Detail Modal ──────────────────────────────────────── */
function DetailModal({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'linear-gradient(135deg, #0f172a, #111827)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Top shine */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${iconColor}18` }}>
                  <Icon className="h-4 w-4" style={{ color: iconColor }} />
                </div>
                <h3 className="text-base font-bold text-slate-100">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/8 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [dist, setDist] = useState<DistributionReport | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyBroadcastStats | null>(null);
  const [showBroadcastDetail, setShowBroadcastDetail] = useState(false);
  const [showDailyDetail, setShowDailyDetail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, d, ds] = await Promise.all([
        broadcastService.getStats(),
        customerService.getDistribution(),
        broadcastService.getDailyStats(),
      ]);
      setStats(s); setDist(d); setDailyStats(ds);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
    const interval = setInterval(fetchData, 15000);
    const socket = getSocket();
    const onBroadcastStatus = () => fetchData();
    socket.on('broadcast:status', onBroadcastStatus);
    return () => { clearInterval(interval); socket.off('broadcast:status', onBroadcastStatus); };
  }, [fetchData]);

  const maxAssigned    = Math.max(1, ...(dist?.by_marketing.map((m) => m.total) ?? [1]));
  const totalBroadcasted = dist?.by_marketing.reduce((acc, m) => acc + m.total_broadcasts, 0) ?? 0;
  const mceActive      = dist?.by_marketing.filter((m) => m.total > 0).length ?? 0;
  const completionPct  = dist && dist.total_customers > 0
    ? Math.round((dist.assigned / dist.total_customers) * 100) : 0;

  const canSeeDetail = user?.role === 'superadmin' || user?.role === 'UH' || user?.role === 'AO';

  return (
    <div className="font-poppins space-y-6">

      {/* ── Greeting ─────────────────────────── */}
      <Greeting
        loading={loading}
        onRefresh={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
      />

      {/* ── Stat Cards Row 1 ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : (
          <>
            <StatCard title="Total Customer" value={dist?.total_customers ?? '-'}
              icon={<Users className="h-5 w-5" />} color="blue" index={0} />
            <StatCard title="Assigned" value={dist?.assigned ?? '-'}
              icon={<UserCheck className="h-5 w-5" />} color="purple" index={1} />
            <StatCard title="Belum Broadcast" value={dist?.not_broadcast ?? '-'}
              icon={<Clock className="h-5 w-5" />} color="amber" index={2} />
            <StatCard
              title="Total Broadcast"
              value={(stats?.total ?? 0) + (stats?.broadcast_manual ?? 0)}
              icon={<Send className="h-5 w-5" />}
              color="green"
              index={3}
              clickable={canSeeDetail && !!dist?.by_marketing?.length}
              onClick={canSeeDetail && dist?.by_marketing?.length ? () => setShowBroadcastDetail(true) : undefined}
            />
          </>
        )}
      </div>

      {/* ── Stat Cards Row 2 ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : (
          <>
            <StatCard title="Pending" value={stats?.pending ?? '-'}
              icon={<Clock className="h-5 w-5" />} color="amber" index={4} />
            <StatCard
              title="Broadcast Harian"
              value={(stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0)}
              icon={<Zap className="h-5 w-5" />}
              color="blue" index={5}
              clickable
              onClick={() => setShowDailyDetail(true)}
            />
            <StatCard title="Sent" value={stats?.sent ?? '-'}
              icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" index={6} />
            <StatCard title="Failed" value={stats?.failed ?? '-'}
              icon={<XCircle className="h-5 w-5" />} color="red" index={7} />
          </>
        )}
      </div>

      {/* ── Summary + Distribution ───────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Ringkasan with progress rings */}
        <Card animDelay={0.1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4.5 w-4.5 text-blue-500" />
              RINGKASAN
            </CardTitle>
            <Badge variant={mceActive > 0 ? 'live' : 'default'} pulse={mceActive > 0} dot>
              {mceActive} MCE Aktif
            </Badge>
          </CardHeader>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700/30">
                  <Skeleton className="mx-auto mb-2 h-8 w-16" />
                  <Skeleton className="mx-auto h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-around gap-4 py-2">
              <ProgressRing value={dist?.assigned ?? 0} max={dist?.total_customers ?? 1}
                color="#3b82f6" label="Progress Assign" subLabel={`${dist?.assigned ?? 0} / ${dist?.total_customers ?? 0}`} />
              <ProgressRing value={totalBroadcasted} max={dist?.assigned ?? 1}
                color="#10b981" label="Sudah Broadcast" subLabel={`${totalBroadcasted} pesan`} />
              <ProgressRing value={(stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0)}
                max={totalBroadcasted || 1} color="#8b5cf6" label="Broadcast Hari Ini"
                subLabel={`${(stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0)} kirim`} />
              <ProgressRing value={mceActive} max={dist?.by_marketing.length || 1}
                color="#f59e0b" label="MCE Online" subLabel={`dari ${dist?.by_marketing.length ?? 0}`} />
            </div>
          )}
        </Card>

        {/* Distribusi MCE */}
        <Card animDelay={0.15}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-blue-500" />
              DISTRIBUSI MCE
            </CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {dist?.by_marketing.map((item, idx) => {
                const pct = maxAssigned > 0 ? Math.round((item.total / maxAssigned) * 100) : 0;
                const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
                return (
                  <motion.div
                    key={item.marketing_id}
                    className="space-y-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.35 }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.marketing?.name || `User #${item.marketing_id}`}
                        </span>
                      </div>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400 text-xs">
                        {item.total} customer
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              {(!dist?.by_marketing || dist.by_marketing.length === 0) && (
                <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  Belum ada distribusi
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Detail MCE Table ──────────────────── */}
      <Card animDelay={0.2} padding={false}>
        <div className="p-5 sm:p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
              DETAIL MCE
            </CardTitle>
          </CardHeader>
        </div>

        {/* Mobile card layout */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 sm:hidden px-4">
          {dist?.by_marketing.map((item, idx) => {
            const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
            return (
              <motion.div
                key={item.marketing_id}
                className="py-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-800"
                    style={{ backgroundColor: color }} />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">
                    {item.marketing?.name || `User #${item.marketing_id}`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {[
                    { v: item.total,            l: 'Ditugaskan', c: 'text-slate-800 dark:text-slate-200' },
                    { v: item.total_broadcasts,  l: 'Broadcast',  c: 'text-slate-800 dark:text-slate-200' },
                    { v: item.sent,              l: 'Terkirim',   c: 'text-emerald-600 dark:text-emerald-400' },
                    { v: item.failed,            l: 'Gagal',      c: 'text-red-600 dark:text-red-400' },
                    { v: item.pending,           l: 'Pending',    c: 'text-amber-600 dark:text-amber-400' },
                  ].map(({ v, l, c }) => (
                    <div key={l}>
                      <p className={`font-satoshi text-base font-bold tabular-nums ${c}`}>{v}</p>
                      <p className="text-[10px] font-medium text-slate-400">{l}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
          {(!dist?.by_marketing || dist.by_marketing.length === 0) && (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada distribusi</p>
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden overflow-hidden sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60">
                {['Marketing', 'Ditugaskan', 'Broadcast', 'Terkirim', 'Gagal', 'Pending'].map((h) => (
                  <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {dist?.by_marketing.map((item, idx) => {
                const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
                return (
                  <motion.tr
                    key={item.marketing_id}
                    className="transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-800"
                          style={{ backgroundColor: color }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.marketing?.name || `User #${item.marketing_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><Badge variant="info">{item.total}</Badge></td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-600 dark:text-slate-400">{item.total_broadcasts}</td>
                    <td className="px-5 py-3.5"><Badge variant="success">{item.sent}</Badge></td>
                    <td className="px-5 py-3.5"><Badge variant="danger">{item.failed}</Badge></td>
                    <td className="px-5 py-3.5"><Badge variant="warning">{item.pending}</Badge></td>
                  </motion.tr>
                );
              })}
              {dist?.by_marketing.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">Belum ada distribusi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Broadcast Detail Modal ────────────── */}
      <DetailModal
        isOpen={showBroadcastDetail}
        onClose={() => setShowBroadcastDetail(false)}
        title="Total Broadcast per MCE"
        icon={Send}
        iconColor="#10b981"
      >
        {dist && (
          <div className="px-6 py-4 space-y-4">
            {dist.by_marketing
              .filter((m) => m.total_broadcasts > 0 || m.manual_broadcasts > 0)
              .sort((a, b) => (b.total_broadcasts + b.manual_broadcasts) - (a.total_broadcasts + a.manual_broadcasts))
              .map((item) => {
                const total = item.total_broadcasts + item.manual_broadcasts;
                const maxBc = Math.max(1, ...dist.by_marketing.map((m) => m.total_broadcasts + m.manual_broadcasts));
                const waPct = total > 0 ? Math.round((item.total_broadcasts / maxBc) * 100) : 0;
                const manualPct = total > 0 ? Math.round((item.manual_broadcasts / maxBc) * 100) : 0;
                return (
                  <div key={item.marketing_id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-300">
                        {item.marketing?.name || `User #${item.marketing_id}`}
                      </span>
                      <span className="font-satoshi text-sm font-bold tabular-nums text-white">{total}</span>
                    </div>
                    <div className="flex gap-1.5 text-[11px] font-medium tabular-nums">
                      {item.total_broadcasts > 0 && <span className="text-yellow-400">{item.total_broadcasts} WA</span>}
                      {item.manual_broadcasts > 0 && <span className="text-emerald-400">{item.manual_broadcasts} Manual</span>}
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-700/80">
                      <motion.div className="absolute right-0 top-0 h-full rounded-l-full bg-emerald-400"
                        initial={{ width: 0 }} animate={{ width: `${manualPct}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                      <motion.div className="absolute left-0 top-0 h-full rounded-r-full bg-yellow-400"
                        initial={{ width: 0 }} animate={{ width: `${waPct}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                );
              })}
            {dist.by_marketing.filter((m) => m.total_broadcasts > 0 || m.manual_broadcasts > 0).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Belum ada broadcast</p>
            )}
          </div>
        )}
        {dist && (
          <div className="border-t border-white/[0.06] px-6 py-3">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" />WA: {dist.by_marketing.reduce((a, m) => a + m.total_broadcasts, 0)}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Manual: {dist.by_marketing.reduce((a, m) => a + m.manual_broadcasts, 0)}</span>
              <span className="font-semibold text-slate-300">Total: {dist.by_marketing.reduce((a, m) => a + m.total_broadcasts + m.manual_broadcasts, 0)}</span>
            </div>
          </div>
        )}
      </DetailModal>

      {/* ── Daily Broadcast Modal ─────────────── */}
      <DetailModal
        isOpen={showDailyDetail}
        onClose={() => setShowDailyDetail(false)}
        title="Broadcast Hari Ini"
        icon={Target}
        iconColor="#3b82f6"
      >
        {dailyStats && (
          <div className="px-6 py-4 space-y-4">
            {dailyStats.users
              .filter((u) => u.items && u.items.length > 0)
              .map((item) => (
                <div key={item.marketing_id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">{item.marketing_name}</span>
                    <span className="font-satoshi text-xs font-bold tabular-nums text-slate-400">
                      {item.sent_today + item.manual_today} kirim
                    </span>
                  </div>
                  <div className="space-y-1">
                    {item.items.map((bc, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center justify-between rounded-xl px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <span className="text-sm font-medium text-slate-300">{bc.customer_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={bc.type === 'manual' ? 'success' : 'purple'} size="xs">
                            {bc.type === 'manual' ? 'Manual' : 'Broadcast'}
                          </Badge>
                          <span className="text-[11px] tabular-nums text-slate-500">
                            {new Date(bc.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            {dailyStats.users.filter((u) => u.items && u.items.length > 0).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Belum ada broadcast hari ini</p>
            )}
          </div>
        )}
        {dailyStats && (
          <div className="border-t border-white/[0.06] px-6 py-3">
            <p className="text-center text-xs text-slate-500">
              Total: <span className="font-semibold text-slate-300">
                {dailyStats.totals.sent_today + dailyStats.totals.manual_today}
              </span> terkirim hari ini
            </p>
          </div>
        )}
      </DetailModal>
    </div>
  );
}