import { useState, useEffect } from 'react';
import { Users, Send, Clock, CheckCircle2, XCircle, Loader2, UserCheck, Activity, TrendingUp, CalendarDays, ArrowLeftRight } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import type { MarketingSummary } from '../../types';

const statusVariant = (status: string): 'warning' | 'info' | 'success' | 'danger' | 'purple' => {
  switch (status) {
    case 'pending': return 'warning';
    case 'processing': return 'info';
    case 'sent': return 'success';
    case 'failed': return 'danger';
    default: return 'purple';
  }
};

function Greeting() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  let greeting = 'Selamat Malam';
  if (hour < 12) greeting = 'Selamat Pagi';
  else if (hour < 17) greeting = 'Selamat Siang';
  else if (hour < 19) greeting = 'Selamat Sore';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fif-600 via-fif-700 to-slate-900 p-6 text-white shadow-lg shadow-fif-900/20 sm:p-8">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative">
        <p className="text-sm font-medium text-fif-200">{greeting}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="uppercase">{user?.name || 'Marketing'}</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-fif-200">
          Pantau progress broadcast WhatsApp Anda di sini
        </p>
      </div>
    </div>
  );
}

export function MarketingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MarketingSummary | null>(null);

  useEffect(() => {
    setLoading(true);
    broadcastService.getMarketingSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const completionPct = summary && summary.assigned_count > 0
    ? Math.round((summary.broadcast.total / summary.assigned_count) * 100)
    : 0;

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

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
            <StatCard
              title="Ditugaskan"
              value={summary?.assigned_count ?? '-'}
              icon={<UserCheck className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              title="Sudah Broadcast"
              value={summary?.broadcast.total ?? '-'}
              icon={<Send className="h-5 w-5" />}
              color="emerald"
            />
            <StatCard
              title="Belum Broadcast"
              value={summary?.not_broadcast_count ?? '-'}
              icon={<Clock className="h-5 w-5" />}
              color="amber"
            />
            <StatCard
              title="Terkirim"
              value={summary?.broadcast.sent ?? '-'}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="blue"
            />
          </>
        )}
      </div>

      {(summary?.shared_data?.total_shared ?? 0) > 0 && summary?.shared_data && (
        <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-5 shadow-sm dark:border-cyan-800 dark:from-cyan-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/40">
              <ArrowLeftRight className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                {summary.shared_data.total_shared} Data Dipinjam
              </p>
              <p className="mt-0.5 text-xs text-cyan-600/80 dark:text-cyan-400/80">
                dari {summary.shared_data.owners.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

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
            <StatCard
              title="Pending"
              value={summary?.broadcast.pending ?? '-'}
              icon={<Clock className="h-5 w-5" />}
              color="yellow"
            />
            <StatCard
              title="Processing"
              value={summary?.broadcast.processing ?? '-'}
              icon={<Loader2 className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Sukses"
              value={summary?.broadcast.sent ?? '-'}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="emerald"
            />
            <StatCard
              title="Gagal"
              value={summary?.broadcast.failed ?? '-'}
              icon={<XCircle className="h-5 w-5" />}
              color="red"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fif-600" />
            Progress Broadcast
          </CardTitle>
        </CardHeader>
        {loading ? (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{completionPct}% terselesaikan</span>
            <span className="text-slate-500 dark:text-slate-400">
              {summary?.broadcast.total ?? 0} / {summary?.assigned_count ?? 0} pelanggan
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fif-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-fif-600" />
              Broadcast Terakhir
            </CardTitle>
          </CardHeader>
          {summary?.last_broadcast ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{summary.last_broadcast.customer_name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(summary.last_broadcast.sent_at || summary.last_broadcast.created_at)}
                  </p>
                </div>
                <Badge variant={statusVariant(summary.last_broadcast.status)}>
                  {summary.last_broadcast.status}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-300">Belum ada broadcast</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-fif-600" />
              Ringkasan
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary?.broadcast.sent ?? 0}</p>
              <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">Terkirim</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary?.broadcast.failed ?? 0}</p>
              <p className="text-xs font-medium text-red-600/70 dark:text-red-400/70">Gagal</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center dark:bg-amber-900/20">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary?.broadcast.pending ?? 0}</p>
              <p className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70">Pending</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-4 text-center dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary?.not_broadcast_count ?? 0}</p>
              <p className="text-xs font-medium text-purple-600/70 dark:text-purple-400/70">Belum dikerjakan</p>
          </div>
        </div>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-fif-600" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        {summary?.recent && summary.recent.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-slate-100/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700/80 dark:from-slate-800 dark:to-slate-800/80 dark:text-slate-400">
                  <th className="px-5 py-3.5">Pelanggan</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {summary.recent.map((item) => (
                  <tr key={item.id} className="transition-all duration-150 hover:bg-fif-50/50 dark:hover:bg-fif-900/20 even:bg-slate-50/50 dark:even:bg-slate-800/30">
                    <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{item.customer_name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(item.sent_at || item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-300">Belum ada aktivitas broadcast</p>
        )}
      </Card>
    </div>
  );
}
