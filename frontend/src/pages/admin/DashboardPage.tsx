import { useState, useEffect } from 'react';
import { Users, Send, Clock, CheckCircle2, XCircle, Loader2, UserCheck, UserX, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { customerService } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import type { BroadcastStats, DistributionReport } from '../../types';

const MARKETING_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444'];

function Greeting() {
  const { user } = useAuth();
  const hour = parseInt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }), 10);
  let greeting = 'Selamat Malam';
  if (hour >= 4 && hour < 11) greeting = 'Selamat Pagi';
  else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';

  const roleLabel: Record<string, string> = { superadmin: 'Superadmin', UH: 'UH', marketing: 'MCE' };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fif-600 via-fif-700 to-slate-900 p-6 text-white shadow-lg shadow-fif-900/20 sm:p-8">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative">
        <p className="text-sm font-medium text-fif-200">{greeting}</p>
        <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="font-clash font-semibold tracking-wide">{user?.name || 'Admin'}</span>
        </h1>
        <p className="mt-0.5 max-w-xl text-sm text-fif-200">
          {roleLabel[user?.role || ''] || user?.role}{user?.kios_id ? ` · ${user.kios_id} ${user.kios_name || ''}` : ''}
        </p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [dist, setDist] = useState<DistributionReport | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      broadcastService.getStats(),
      customerService.getDistribution(),
    ]).then(([s, d]) => {
      setStats(s);
      setDist(d);
    }).finally(() => setLoading(false));
  }, []);

  const maxAssigned = Math.max(1, ...(dist?.by_marketing.map((m) => m.total) ?? [1]));

  const totalBroadcasted = dist?.by_marketing.reduce((acc, m) => acc + m.total_broadcasts, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Greeting />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Total Customer" value={dist?.total_customers ?? '-'} icon={<Users className="h-5 w-5" />} color="blue" />
            <StatCard title="Assigned" value={dist?.assigned ?? '-'} icon={<UserCheck className="h-5 w-5" />} color="purple" />
            <StatCard title="Unassigned" value={dist?.unassigned ?? '-'} icon={<UserX className="h-5 w-5" />} color="amber" />
            <StatCard title="Total Broadcast" value={stats?.total ?? '-'} icon={<Send className="h-5 w-5" />} color="green" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Pending" value={stats?.pending ?? '-'} icon={<Clock className="h-5 w-5" />} color="amber" />
            <StatCard title="Processing" value={stats?.processing ?? '-'} icon={<Loader2 className="h-5 w-5" />} color="blue" />
            <StatCard title="Sent" value={stats?.sent ?? '-'} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" />
            <StatCard title="Failed" value={stats?.failed ?? '-'} icon={<XCircle className="h-5 w-5" />} color="red" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-fif-600" />
              Distribution per Marketing
            </CardTitle>
          </CardHeader>
          {loading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {dist?.by_marketing.map((item, idx) => {
                const pct = Math.round((item.total / maxAssigned) * 100);
                const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
                return (
                  <div key={item.marketing_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.marketing?.name || `User #${item.marketing_id}`}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{item.total} customer</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!dist?.by_marketing || dist.by_marketing.length === 0) && (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada distribusi</p>
              )}
            </>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-fif-600" />
              Ringkasan Distribution
            </CardTitle>
          </CardHeader>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/50">
                  <Skeleton className="mx-auto mb-2 h-7 w-16" />
                  <Skeleton className="mx-auto h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-4 text-center dark:bg-blue-900/20">
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{dist?.assigned ?? 0}</p>
              <p className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70">Terassign</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center dark:bg-amber-900/20">
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{dist?.unassigned ?? 0}</p>
              <p className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70">Belum diassign</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{totalBroadcasted}</p>
              <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">Total Broadcast</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-4 text-center dark:bg-purple-900/20">
              <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {dist ? dist.by_marketing.length : '-'}
              </p>
              <p className="text-xs font-medium text-purple-600/70 dark:text-purple-400/70">Marketing Aktif</p>
            </div>
          </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fif-600" />
            Detail Distribution per Marketing
          </CardTitle>
        </CardHeader>
        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                 <th className="px-5 py-3.5">Marketing</th>
                <th className="px-5 py-3.5 text-center">Ditugaskan</th>
                <th className="px-5 py-3.5 text-center">Total Broadcast</th>
                <th className="px-5 py-3.5 text-center">
                  <span className="text-emerald-600 dark:text-emerald-400">Terkirim</span>
                </th>
                <th className="px-5 py-3.5 text-center">
                  <span className="text-red-600 dark:text-red-400">Gagal</span>
                </th>
                <th className="px-5 py-3.5 text-center">
                  <span className="text-amber-600 dark:text-amber-400">Pending</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dist?.by_marketing.map((item, idx) => {
                const color = MARKETING_COLORS[idx % MARKETING_COLORS.length];
                return (
                  <tr key={item.marketing_id} className="transition-all duration-150 hover:bg-fif-50/50 dark:hover:bg-fif-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
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
                    <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-400">
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
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">Belum ada distribusi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
