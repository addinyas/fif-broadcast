'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Send, Clock, CheckCircle2, XCircle, UserCheck, Activity,
  TrendingUp, CalendarDays, ArrowLeftRight, RefreshCw, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { broadcastService } from '@/services/broadcastService';
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
import type { MarketingSummary, DailyBroadcastStats } from '@/types';

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

/* ── Greeting ─────────────────────────────────────────── */
function Greeting({ onRefresh, loading }: { onRefresh?: () => void; loading?: boolean }) {
  const { user } = useAuth();
  const clock = useClock();
  const hour = parseInt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }), 10);

  let greeting = 'Selamat Malam';
  let greetEmoji = '🌙';
  if (hour >= 4 && hour < 11) { greeting = 'Selamat Pagi'; greetEmoji = '☀️'; }
  else if (hour >= 11 && hour < 15) { greeting = 'Selamat Siang'; greetEmoji = '⛅'; }
  else if (hour >= 15 && hour < 18) { greeting = 'Selamat Sore'; greetEmoji = '🌅'; }

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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
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
              {user?.name || 'Marketing'}
            </h1>
            <p className="mt-1.5 text-sm text-blue-200/60">
              Pantau progress broadcast WhatsApp Anda secara real-time
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <motion.div
              className="rounded-xl px-3 py-1.5 font-mono text-lg font-bold tabular-nums text-white/90"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {clock}
            </motion.div>

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

/* ── Progress Ring ─────────────────────────────────────── */
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

export default function MarketingDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MarketingSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyBroadcastStats | null>(null);
  const [showDailyDetail, setShowDailyDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [drawerTick, setDrawerTick] = useState(0);

  const openStatus = (status: string) => {
    setStatusFilter(status);
    setDrawerTick((t) => t + 1);
  };

  const STATUS_DRAWER: Record<string, { title: string; accent: 'amber' | 'blue' | 'emerald' | 'red' | 'slate' }> = {
    pending: { title: 'Pesan Menunggu', accent: 'amber' },
    processing: { title: 'Pesan Diproses', accent: 'blue' },
    sent: { title: 'Pesan Terkirim', accent: 'emerald' },
    failed: { title: 'Pesan Gagal', accent: 'red' },
  };

  const drawerConfig = statusFilter ? STATUS_DRAWER[statusFilter] : null;

  const fetchData = useCallback(async () => {
    try {
      const [data, ds] = await Promise.all([
        broadcastService.getMarketingSummary(),
        broadcastService.getDailyStats(),
      ]);
      setSummary(data);
      setDailyStats(ds);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));

    const interval = setInterval(fetchData, 15000);
    const socket = getSocket();
    const onBroadcastStatus = () => fetchData();
    socket.on('broadcast:status', onBroadcastStatus);

    return () => {
      clearInterval(interval);
      socket.off('broadcast:status', onBroadcastStatus);
    };
  }, [fetchData]);

  const completionPct = summary && summary.assigned_count > 0
    ? Math.min(100, Math.round(((summary.assigned_count - summary.not_broadcast_count) / summary.assigned_count) * 100))
    : 0;

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="font-poppins space-y-6">
      <Greeting loading={loading} onRefresh={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }} />

      {/* ── Stat Cards Row 1 ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : (
          <>
            <StatCard title="Ditugaskan" value={summary?.assigned_count ?? '-'} icon={<UserCheck className="h-5 w-5" />} color="purple" index={0} />
            <StatCard title="Sudah Broadcast" value={(summary?.broadcast.total ?? 0) + (summary?.broadcast.broadcast_manual ?? 0)} icon={<Send className="h-5 w-5" />} color="emerald" index={1} />
            <StatCard title="Belum Broadcast" value={summary?.not_broadcast_count ?? '-'} icon={<Clock className="h-5 w-5" />} color="amber" index={2} />
            <StatCard title="Terkirim" value={summary?.broadcast.sent ?? '-'} icon={<CheckCircle2 className="h-5 w-5" />} color="blue" index={3} />
          </>
        )}
      </div>

      {/* ── Data Shared Alert ────────────────── */}
      {(summary?.shared_data?.total_shared ?? 0) > 0 && summary?.shared_data && (
        <motion.div
          className="rounded-2xl border border-cyan-200/60 bg-gradient-to-r from-cyan-50 to-blue-50 p-5 shadow-sm dark:border-cyan-800/40 dark:from-cyan-950/30 dark:to-blue-950/30"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
              <ArrowLeftRight className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                {summary.shared_data.total_shared} Data Dipinjam
              </p>
              <p className="mt-0.5 text-xs text-cyan-600/70 dark:text-cyan-400/70">
                dari {summary.shared_data.owners.join(', ')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Stat Cards Row 2 ─────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading ? (
          <><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
        ) : (
          <>
            <StatCard title="Pending" value={summary?.broadcast.pending ?? '-'} icon={<Clock className="h-5 w-5" />} color="yellow" index={4}
              clickable onClick={() => openStatus('pending')} />
            <StatCard title="Diproses" value={summary?.broadcast.processing ?? 0} icon={<Activity className="h-5 w-5" />} color="purple" index={5}
              clickable onClick={() => openStatus('processing')} />
            <StatCard title="Gagal" value={summary?.broadcast.failed ?? '-'} icon={<XCircle className="h-5 w-5" />} color="red" index={6}
              clickable onClick={() => openStatus('failed')} />
            <StatCard
              title="Broadcast Harian"
              value={(summary?.broadcast.sent_today ?? 0) + (summary?.broadcast.broadcast_manual_today ?? 0)}
              icon={<Zap className="h-5 w-5" />}
              color="blue"
              index={7}
              clickable
              onClick={() => setShowDailyDetail(true)}
            />
          </>
        )}
      </div>

      {/* ── Progress Bar Card ─────────────────── */}
      <Card animDelay={0.1}>
        <CardHeader className="mb-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
            Progress Broadcast
          </CardTitle>
        </CardHeader>
        {loading ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3.5 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{completionPct}% Selesai</span>
              <span className="text-slate-400 dark:text-slate-500 text-xs">
                {(summary?.assigned_count ?? 0) - (summary?.not_broadcast_count ?? 0)} / {summary?.assigned_count ?? 0} pelanggan
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Last Broadcast & Summary Cards ───── */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card animDelay={0.15}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-blue-500" />
              Broadcast Terakhir
            </CardTitle>
          </CardHeader>
          {summary?.last_broadcast ? (
            <div className="rounded-xl bg-slate-50/80 px-4 py-3.5 ring-1 ring-slate-100 dark:bg-slate-700/30 dark:ring-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{summary.last_broadcast.customer_name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(summary.last_broadcast.sent_at || summary.last_broadcast.created_at)}
                  </p>
                </div>
                <StatusBadge status={summary.last_broadcast.status} />
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada broadcast</p>
          )}
        </Card>

        <Card animDelay={0.2}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-blue-500" />
              Ringkasan Status
            </CardTitle>
          </CardHeader>
          <div className="flex justify-around py-2">
            <ProgressRing value={summary?.broadcast.sent ?? 0} max={summary?.assigned_count ?? 1} color="#10b981" label="Terkirim" subLabel={`${summary?.broadcast.sent ?? 0} pesan`} />
            <ProgressRing value={summary?.broadcast.failed ?? 0} max={summary?.assigned_count ?? 1} color="#ef4444" label="Gagal" subLabel={`${summary?.broadcast.failed ?? 0} pesan`} />
            <ProgressRing value={summary?.not_broadcast_count ?? 0} max={summary?.assigned_count ?? 1} color="#8b5cf6" label="Belum Kirim" subLabel={`${summary?.not_broadcast_count ?? 0} tersisa`} />
          </div>
        </Card>
      </div>

      {/* ── Recent Activity ──────────────────── */}
      <Card animDelay={0.25}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-blue-500" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        {summary?.recent && summary.recent.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700/50">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-500">
                  <th className="px-5 py-3">Pelanggan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {summary.recent.map((item) => (
                  <tr key={item.id} className="transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                    <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{item.customer_name}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-400 dark:text-slate-500">{formatDate(item.sent_at || item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada aktivitas broadcast</p>
        )}
      </Card>

      {/* ── Daily Broadcast Drawer ─────────────── */}
      <DetailDrawer
        open={showDailyDetail}
        onClose={() => setShowDailyDetail(false)}
        title="Broadcast Hari Ini"
        subtitle="Pesan terkirim hari ini"
        accent="blue"
        icon={<Zap className="h-5 w-5 text-blue-500" />}
      >
        {(() => {
          const myStats = dailyStats?.users.find((u) => u.marketing_id === user?.id);
          if (!myStats || !myStats.items || myStats.items.length === 0) {
            return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada broadcast hari ini</p>;
          }
          return (
            <div className="space-y-2">
              {myStats.items.map((bc, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{bc.customer_name}</p>
                    <p className="text-[11px] tabular-nums text-slate-500">
                      {new Date(bc.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant={bc.type === 'manual' ? 'success' : 'purple'} size="xs">
                    {bc.type === 'manual' ? 'Manual' : 'Broadcast'}
                  </Badge>
                </motion.div>
              ))}
              <div className="rounded-xl bg-slate-100/80 px-4 py-3 text-center text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                Total: <span className="font-semibold">{myStats.items.length}</span> pesan hari ini
              </div>
            </div>
          );
        })()}
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
        subtitle="Detail pesan per status broadcast Anda"
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
