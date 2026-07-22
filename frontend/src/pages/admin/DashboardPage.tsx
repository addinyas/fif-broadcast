import { useState, useEffect, useCallback } from 'react';
import { Users, Send, Clock, CheckCircle2, XCircle, UserCheck, TrendingUp, BarChart3, PieChart, RefreshCw, X } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { getSocket } from '../../services/socketService';
import type { BroadcastStats, DistributionReport, DailyBroadcastStats } from '../../types';

const MARKETING_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444'];

function Greeting({ onRefresh }: { onRefresh?: () => void }) {
  const { user } = useAuth();
  const hour = parseInt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }), 10);
  let greeting = 'Selamat Malam';
  if (hour >= 4 && hour < 11) greeting = 'Selamat Pagi';
  else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';

  const roleLabel: Record<string, string> = { superadmin: 'Superadmin', UH: 'UH', marketing: 'MCE' };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-fif-800 to-fif-600 p-6 text-white shadow-xl shadow-fif-900/30 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.03]" />
      <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/[0.03]" />
      <div className="absolute right-0 top-0 h-px w-2/3 bg-gradient-to-r from-white/20 to-transparent" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-fif-200/80">{greeting}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="font-satoshi font-bold tracking-wide">{user?.name || 'Admin'}</span>
          </h1>
          <p className="mt-1 text-sm text-fif-200/60">
            {roleLabel[user?.role || ''] || user?.role}{user?.kios_id ? ` · ${user.kios_id} ${user.kios_name || ''}` : ''}
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
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
      setStats(s);
      setDist(d);
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

  const maxAssigned = Math.max(1, ...(dist?.by_marketing.map((m) => m.total) ?? [1]));

  const totalBroadcasted = dist?.by_marketing.reduce((acc, m) => acc + m.total_broadcasts, 0) ?? 0;

  const mceActive = dist?.by_marketing.filter((m) => m.total > 0).length ?? 0;

  const completionPct = dist && dist.total_customers > 0
    ? Math.round((dist.assigned / dist.total_customers) * 100)
    : 0;

  return (
    <div className="font-poppins space-y-6">
      <div className="animate-fade-in">
        <Greeting onRefresh={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}><StatCard title="Total Customer" value={dist?.total_customers ?? '-'} icon={<Users className="h-5 w-5" />} color="blue" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '50ms' }}><StatCard title="Assigned" value={dist?.assigned ?? '-'} icon={<UserCheck className="h-5 w-5" />} color="purple" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}><StatCard title="Belum Broadcast" value={dist?.not_broadcast ?? '-'} icon={<Clock className="h-5 w-5" />} color="amber" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
              <button
                onClick={() => (user?.role === 'superadmin' || user?.role === 'UH') && dist?.by_marketing && dist.by_marketing.length > 0 && setShowBroadcastDetail(true)}
                className={`w-full ${(user?.role === 'superadmin' || user?.role === 'UH') && dist && dist.by_marketing.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <StatCard title="Total Broadcast" value={(stats?.total ?? 0) + (stats?.broadcast_manual ?? 0)} icon={<Send className="h-5 w-5" />} color="green" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}><StatCard title="Pending" value={stats?.pending ?? '-'} icon={<Clock className="h-5 w-5" />} color="amber" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
              <button
                onClick={() => setShowDailyDetail(true)}
                className="w-full cursor-pointer"
              >
                <StatCard title="Broadcast Harian" value={(stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0)} icon={<Send className="h-5 w-5" />} color="blue" />
              </button>
            </div>
            <div className="animate-slide-up" style={{ animationDelay: '300ms' }}><StatCard title="Sent" value={stats?.sent ?? '-'} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '350ms' }}><StatCard title="Failed" value={stats?.failed ?? '-'} icon={<XCircle className="h-5 w-5" />} color="red" /></div>
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-fif-500" />
              DISTRIBUSI MCE
            </CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {dist?.by_marketing.map((item, idx) => {
                const pct = Math.round((item.total / maxAssigned) * 100);
                const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
                return (
                  <div key={item.marketing_id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.marketing?.name || `User #${item.marketing_id}`}
                      </span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">{item.total} customer</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}cc, ${color})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!dist?.by_marketing || dist.by_marketing.length === 0) && (
                <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada distribusi</p>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
              <PieChart className="h-5 w-5 text-fif-500" />
              RINGKASAN
            </CardTitle>
          </CardHeader>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-700/30">
                  <Skeleton className="mx-auto mb-2 h-8 w-16" />
                  <Skeleton className="mx-auto h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-fif-100 p-4 text-center ring-1 ring-fif-200 dark:bg-fif-900/30 dark:ring-fif-700/40">
                <p className="font-satoshi text-3xl font-bold tabular-nums text-fif-600 dark:text-fif-400">{completionPct}%</p>
                <p className="mt-1 text-xs font-medium text-fif-600/60 dark:text-fif-400/60">Progress Assign</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center ring-1 ring-amber-100 dark:bg-amber-950/40 dark:ring-amber-800/40">
                <p className="font-satoshi text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{totalBroadcasted}</p>
                <p className="mt-1 text-xs font-medium text-amber-600/60 dark:text-amber-400/60">Total Broadcast</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-800/40">
                <p className="font-satoshi text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{mceActive}</p>
                <p className="mt-1 text-xs font-medium text-emerald-600/60 dark:text-emerald-400/60">MCE Aktif</p>
              </div>
              <div className="rounded-xl bg-purple-50 p-4 text-center ring-1 ring-purple-100 dark:bg-purple-950/40 dark:ring-purple-800/40">
                <p className="font-satoshi text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                  {(stats?.sent_today ?? 0) + (stats?.broadcast_manual_today ?? 0)}
                </p>
                <p className="mt-1 text-xs font-medium text-purple-600/60 dark:text-purple-400/60">Broadcast Hari Ini</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fif-500" />
            DETAIL MCE
          </CardTitle>
        </CardHeader>
        {/* Mobile: card layout */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 sm:hidden">
          {dist?.by_marketing.map((item, idx) => {
            const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
            return (
              <div key={item.marketing_id} className="px-4 py-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-800"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">
                    {item.marketing?.name || `User #${item.marketing_id}`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  <div className="text-center">
                    <p className="font-satoshi text-base font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.total}</p>
                    <p className="text-[10px] font-medium text-slate-400">Ditugaskan</p>
                  </div>
                  <div className="text-center">
                    <p className="font-satoshi text-base font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.total_broadcasts}</p>
                    <p className="text-[10px] font-medium text-slate-400">Broadcast</p>
                  </div>
                  <div className="text-center">
                    <p className="font-satoshi text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{item.sent}</p>
                    <p className="text-[10px] font-medium text-emerald-500">Terkirim</p>
                  </div>
                  <div className="text-center">
                    <p className="font-satoshi text-base font-bold tabular-nums text-red-600 dark:text-red-400">{item.failed}</p>
                    <p className="text-[10px] font-medium text-red-500">Gagal</p>
                  </div>
                  <div className="text-center">
                    <p className="font-satoshi text-base font-bold tabular-nums text-amber-600 dark:text-amber-400">{item.pending}</p>
                    <p className="text-[10px] font-medium text-amber-500">Pending</p>
                  </div>
                </div>
              </div>
            );
          })}
          {(!dist?.by_marketing || dist.by_marketing.length === 0) && (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada distribusi</p>
          )}
        </div>
        {/* Desktop: table layout */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700/50 sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-500">
                <th className="px-5 py-3">Marketing</th>
                <th className="px-5 py-3 text-center">Ditugaskan</th>
                <th className="px-5 py-3 text-center">Broadcast</th>
                <th className="px-5 py-3 text-center">
                  <span className="text-emerald-500">Terkirim</span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="text-red-500">Gagal</span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="text-amber-500">Pending</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {dist?.by_marketing.map((item, idx) => {
                const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
                return (
                  <tr key={item.marketing_id} className="transition-colors duration-150 hover:bg-fif-50/40 dark:hover:bg-fif-950/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-800"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {item.marketing?.name || `User #${item.marketing_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="info">{item.total}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums text-slate-600 dark:text-slate-400">
                      {item.total_broadcasts}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="success">{item.sent}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="danger">{item.failed}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="warning">{item.pending}</Badge>
                    </td>
                  </tr>
                );
              })}
              {dist?.by_marketing.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada distribusi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showBroadcastDetail && dist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBroadcastDetail(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Total Broadcast per MCE</h3>
              </div>
              <button
                onClick={() => setShowBroadcastDetail(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-6 py-4">
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
                      <div key={item.marketing_id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {item.marketing?.name || `User #${item.marketing_id}`}
                          </span>
                          <span className="font-satoshi text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                            {total}
                          </span>
                        </div>
                        <div className="flex gap-1 text-[11px] font-medium tabular-nums">
                          {item.total_broadcasts > 0 && <span className="text-yellow-600 dark:text-yellow-400">{item.total_broadcasts} WA</span>}
                          {item.manual_broadcasts > 0 && <span className="text-emerald-600 dark:text-emerald-400">{item.manual_broadcasts} Manual</span>}
                        </div>
                        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
                          {/* Manual: right to left (hijau) */}
                          <div
                            className="absolute right-0 top-0 h-full rounded-l-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${manualPct}%` }}
                          />
                          {/* WA: left to right (kuning) */}
                          <div
                            className="absolute left-0 top-0 h-full rounded-r-full bg-yellow-400 transition-all duration-500"
                            style={{ width: `${waPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {dist.by_marketing.filter((m) => m.total_broadcasts > 0 || m.manual_broadcasts > 0).length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada broadcast</p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-3 dark:border-slate-700">
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> WA: {dist.by_marketing.reduce((a, m) => a + m.total_broadcasts, 0)}</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Manual: {dist.by_marketing.reduce((a, m) => a + m.manual_broadcasts, 0)}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Total: {dist.by_marketing.reduce((a, m) => a + m.total_broadcasts + m.manual_broadcasts, 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDailyDetail && dailyStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDailyDetail(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Broadcast Hari Ini</h3>
              </div>
              <button
                onClick={() => setShowDailyDetail(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {dailyStats.users
                  .filter((u) => u.items && u.items.length > 0)
                  .map((item) => (
                    <div key={item.marketing_id}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.marketing_name}</span>
                        <span className="font-satoshi text-xs font-bold tabular-nums text-slate-400">{item.sent_today + item.manual_today} kirim</span>
                      </div>
                      <div className="space-y-1">
                        {item.items.map((bc, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/30">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{bc.customer_name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${bc.type === 'manual' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
                                {bc.type === 'manual' ? 'Manual' : 'Broadcast'}
                              </span>
                              <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                                {new Date(bc.sent_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                {dailyStats.users.filter((u) => u.items && u.items.length > 0).length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada broadcast hari ini</p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-3 dark:border-slate-700">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Total: <span className="font-semibold text-slate-600 dark:text-slate-300">{dailyStats.totals.sent_today + dailyStats.totals.manual_today}</span> terkirim
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
