'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Send, Clock, CheckCircle2, XCircle, UserCheck,
  TrendingUp, BarChart3, PieChart, RefreshCw, Zap, Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { broadcastService } from '@/services/broadcastService';
import { customerService } from '@/services/customerService';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailDrawer } from '@/components/ui/DetailDrawer';
import { StatusHistoryPanel } from '@/components/ui/StatusHistoryPanel';
import ResponseRatePanel from '@/components/features/ResponseRatePanel';
import { getSocket } from '@/services/socketService';
import type { BroadcastStats, DistributionReport, DailyBroadcastStats } from '@/types';

const MARKETING_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
];

const DAILY_LIMIT = 150; // kuota broadcast harian per MCE

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

/* ── Daily Activity Chart ─────────────────────────────── */
function DailyActivityChart({ dailyStats, onOpenDetail }: {
  dailyStats: DailyBroadcastStats | null;
  onOpenDetail: () => void;
}) {
  const users = (dailyStats?.users ?? []).filter(
    (u) => u.sent_today + u.failed_today + u.pending_today + u.manual_today > 0,
  );
  const maxTotal = Math.max(1, ...users.map((u) => u.sent_today + u.failed_today + u.pending_today + u.manual_today));

  if (users.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
        Belum ada broadcast hari ini
      </p>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-3">
        {users.map((u, idx) => {
          const total = u.sent_today + u.failed_today + u.pending_today + u.manual_today;
          const segments = [
            { label: 'Terkirim', value: u.sent_today, cls: 'bg-emerald-500' },
            { label: 'Manual', value: u.manual_today, cls: 'bg-blue-500' },
            { label: 'Pending', value: u.pending_today, cls: 'bg-amber-400' },
            { label: 'Gagal', value: u.failed_today, cls: 'bg-red-500' },
          ].filter((s) => s.value > 0);

          return (
            <Tooltip key={u.marketing_id}>
              <TooltipTrigger asChild>
                <motion.button
                  type="button"
                  onClick={onOpenDetail}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                >
                  <span className="w-32 shrink-0 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {u.marketing_name || `User #${u.marketing_id}`}
                  </span>
                  <span className="flex h-2.5 flex-1 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                    {segments.map((s) => (
                      <motion.span
                        key={s.label}
                        className={`h-full ${s.cls}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.value / maxTotal) * 100}%` }}
                        transition={{ duration: 0.7, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ))}
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">
                    {total}
                  </span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">{u.marketing_name}</p>
                  {segments.map((s) => (
                    <p key={s.label} className="flex items-center gap-2 text-xs">
                      <span className={`h-2 w-2 rounded-full ${s.cls}`} />
                      {s.label}: {s.value}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/* ── Detail Modal ──────────────────────────────────────── */
/* (diganti DetailDrawer) */

/* ── Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [dist, setDist] = useState<DistributionReport | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyBroadcastStats | null>(null);
  const [showBroadcastDetail, setShowBroadcastDetail] = useState(false);
  const [showDailyDetail, setShowDailyDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [drawerTick, setDrawerTick] = useState(0);

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

  const activeToday = dailyStats?.users.filter(
    (u) => u.sent_today + u.failed_today + u.pending_today + u.manual_today > 0,
  ).length ?? 0;
  const todaySent = (stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0);
  const quotaCap  = Math.max(1, activeToday * DAILY_LIMIT);
  const quotaPct  = Math.min(Math.round((todaySent / quotaCap) * 100), 100);

  const canSeeDetail = user?.role === 'superadmin' || user?.role === 'UH' || user?.role === 'AO';

  const openStatus = (status: string) => {
    setStatusFilter(status);
    setDrawerTick((t) => t + 1);
  };

  const STATUS_DRAWER: Record<string, { title: string; accent: 'amber' | 'blue' | 'emerald' | 'red' | 'slate' }> = {
    pending: { title: 'Pesan Menunggu', accent: 'amber' },
    processing: { title: 'Pesan Diproses', accent: 'blue' },
    sent: { title: 'Pesan Terkirim', accent: 'emerald' },
    failed: { title: 'Pesan Gagal', accent: 'red' },
    cancelled: { title: 'Pesan Dibatalkan', accent: 'slate' },
  };

  const drawerConfig = statusFilter ? STATUS_DRAWER[statusFilter] : null;

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
              icon={<Clock className="h-5 w-5" />} color="amber" index={4}
              clickable
              onClick={() => openStatus('pending')} />
            <StatCard
              title="Broadcast Harian"
              value={(stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0)}
              icon={<Zap className="h-5 w-5" />}
              color="blue" index={5}
              clickable
              onClick={() => setShowDailyDetail(true)}
            />
            <StatCard title="Sent" value={stats?.sent ?? '-'}
              icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" index={6}
              clickable
              onClick={() => openStatus('sent')} />
            <StatCard title="Failed" value={stats?.failed ?? '-'}
              icon={<XCircle className="h-5 w-5" />} color="red" index={7}
              clickable
              onClick={() => openStatus('failed')} />
          </>
        )}
      </div>

      {/* ── Ringkasan + Aktivitas Hari Ini (Bento) ─────── */}
      <div className="grid gap-5 lg:grid-cols-3">
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
            <div>
              <div className="flex flex-wrap justify-around gap-4 py-2">
                <ProgressRing value={dist?.assigned ?? 0} max={dist?.total_customers ?? 1}
                  color="#3b82f6" label="Progress Assign" subLabel={`${dist?.assigned ?? 0} / ${dist?.total_customers ?? 0}`} />
                <ProgressRing value={totalBroadcasted} max={dist?.assigned ?? 1}
                  color="#10b981" label="Sudah Broadcast" subLabel={`${totalBroadcasted} pesan`} />
                <ProgressRing value={todaySent}
                  max={totalBroadcasted || 1} color="#8b5cf6" label="Broadcast Hari Ini"
                  subLabel={`${todaySent} kirim`} />
              </div>

              {/* Kuota broadcast harian */}
              <div className="mt-4 rounded-xl border border-blue-100/80 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                    <Zap className="h-3.5 w-3.5 text-blue-500" /> Kuota Broadcast Hari Ini
                  </span>
                  <span className="font-satoshi font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {todaySent} / {quotaCap}
                  </span>
                </div>
                <Progress value={quotaPct} className="h-2 bg-blue-100 dark:bg-slate-700" />
                <p className="mt-2 text-[10px] text-slate-400">
                  Limit {DAILY_LIMIT} pesan per MCE/hari · {activeToday} MCE mengirim hari ini
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Aktivitas Hari Ini chart */}
        <Card animDelay={0.15} glow className="lg:col-span-2">
          <CardHeader className="flex-wrap gap-y-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-blue-500" />
              AKTIVITAS HARI INI
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Terkirim</span>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Manual</span>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Pending</span>
              <Separator orientation="vertical" className="h-3.5" />
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Gagal</span>
            </div>
          </CardHeader>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 flex-1" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <DailyActivityChart
              dailyStats={dailyStats}
              onOpenDetail={() => setShowDailyDetail(true)}
            />
          )}
        </Card>
      </div>

      {/* ── Distribusi MCE ──────────────────── */}
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

      {/* ── Total Broadcast Drawer ────────────── */}
      <DetailDrawer
        open={showBroadcastDetail}
        onClose={() => setShowBroadcastDetail(false)}
        title="Total Broadcast per MCE"
        subtitle="Rincian broadcast WA vs manual per marketing"
        accent="emerald"
        icon={<Send className="h-5 w-5 text-emerald-500" />}
      >
        {dist && (
          <div className="space-y-4">
            {dist.by_marketing
              .filter((m) => m.total_broadcasts > 0 || m.manual_broadcasts > 0)
              .sort((a, b) => (b.total_broadcasts + b.manual_broadcasts) - (a.total_broadcasts + a.manual_broadcasts))
              .map((item) => {
                const total = item.total_broadcasts + item.manual_broadcasts;
                const maxBc = Math.max(1, ...dist.by_marketing.map((m) => m.total_broadcasts + m.manual_broadcasts));
                const waPct = total > 0 ? Math.round((item.total_broadcasts / maxBc) * 100) : 0;
                const manualPct = total > 0 ? Math.round((item.manual_broadcasts / maxBc) * 100) : 0;
                return (
                  <div key={item.marketing_id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.marketing?.name || `User #${item.marketing_id}`}
                      </span>
                      <span className="font-satoshi text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{total}</span>
                    </div>
                    <div className="mt-1 flex gap-1.5 text-[11px] font-medium tabular-nums">
                      {item.total_broadcasts > 0 && <span className="text-amber-600 dark:text-amber-400">{item.total_broadcasts} WA</span>}
                      {item.manual_broadcasts > 0 && <span className="text-emerald-600 dark:text-emerald-400">{item.manual_broadcasts} Manual</span>}
                    </div>
                    <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                      <motion.div className="absolute right-0 top-0 h-full rounded-l-full bg-emerald-400"
                        initial={{ width: 0 }} animate={{ width: `${manualPct}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                      <motion.div className="absolute left-0 top-0 h-full rounded-r-full bg-amber-400"
                        initial={{ width: 0 }} animate={{ width: `${waPct}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                );
              })}
            {dist.by_marketing.filter((m) => m.total_broadcasts > 0 || m.manual_broadcasts > 0).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada broadcast</p>
            )}
            <div className="rounded-xl bg-slate-100/80 px-4 py-3 text-center text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />WA: {dist.by_marketing.reduce((a, m) => a + m.total_broadcasts, 0)}</span>
              <span className="mx-3 inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" />Manual: {dist.by_marketing.reduce((a, m) => a + m.manual_broadcasts, 0)}</span>
              <span className="font-semibold">Total: {dist.by_marketing.reduce((a, m) => a + m.total_broadcasts + m.manual_broadcasts, 0)}</span>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* ── Daily Broadcast Drawer ─────────────── */}
      <DetailDrawer
        open={showDailyDetail}
        onClose={() => setShowDailyDetail(false)}
        title="Broadcast Hari Ini"
        subtitle="Pesan terkirim hari ini per marketing"
        accent="blue"
        icon={<Zap className="h-5 w-5 text-blue-500" />}
      >
        {dailyStats && (
          <div className="space-y-4">
            {dailyStats.users
              .filter((u) => u.items && u.items.length > 0)
              .map((item) => (
                <div key={item.marketing_id}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.marketing_name}</span>
                    <span className="font-satoshi text-xs font-bold tabular-nums text-slate-400">
                      {item.sent_today + item.manual_today} kirim
                    </span>
                  </div>
                  <div className="space-y-1">
                    {item.items.map((bc, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{bc.customer_name}</span>
                        <div className="flex shrink-0 items-center gap-2">
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
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada broadcast hari ini</p>
            )}
            <div className="rounded-xl bg-slate-100/80 px-4 py-3 text-center text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              Total: <span className="font-semibold">
                {dailyStats.totals.sent_today + dailyStats.totals.manual_today}
              </span> terkirim hari ini
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* ── Response Rate ──────────────────── */}
      <div className="mt-6">
        <ResponseRatePanel />
      </div>

      {/* ── Status Detail Drawer ──────────────── */}
      <DetailDrawer
        open={!!statusFilter}
        onClose={() => setStatusFilter(null)}
        title={drawerConfig?.title ?? ''}
        subtitle={`Detail pesan per status · auto-refresh 15 detik`}
        accent={drawerConfig?.accent ?? 'slate'}
        icon={statusFilter ? <StatusBadge status={statusFilter} size="sm" /> : null}
      >
        {statusFilter && (
          <StatusHistoryPanel status={statusFilter} keyRef={drawerTick} />
        )}
      </DetailDrawer>
    </div>
  );
}