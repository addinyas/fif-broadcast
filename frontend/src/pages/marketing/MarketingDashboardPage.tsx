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
    case 'cancelled': return 'danger';
    default: return 'purple';
  }
};

function Greeting() {
  const { user } = useAuth();
  const hour = parseInt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }), 10);
  let greeting = 'Selamat Malam';
  if (hour >= 4 && hour < 11) greeting = 'Selamat Pagi';
  else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-fif-800 to-fif-600 p-6 text-white shadow-xl shadow-fif-900/30 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.03]" />
      <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/[0.03]" />
      <div className="absolute right-0 top-0 h-px w-2/3 bg-gradient-to-r from-white/20 to-transparent" />
      <div className="relative">
        <p className="text-sm font-medium text-fif-200/80">{greeting}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="font-satoshi font-bold tracking-wide">{user?.name || 'Marketing'}</span>
        </h1>
        <p className="mt-1 text-sm text-fif-200/60">
          Pantau progress broadcast WhatsApp Anda
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
    <div className="font-poppins space-y-6">
      <div className="animate-fade-in">
        <Greeting />
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
            <div className="animate-slide-up" style={{ animationDelay: '0ms' }}><StatCard title="Ditugaskan" value={summary?.assigned_count ?? '-'} icon={<UserCheck className="h-5 w-5" />} color="purple" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '50ms' }}><StatCard title="Sudah Broadcast" value={summary?.broadcast.total ?? '-'} icon={<Send className="h-5 w-5" />} color="emerald" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '100ms' }}><StatCard title="Belum Broadcast" value={summary?.not_broadcast_count ?? '-'} icon={<Clock className="h-5 w-5" />} color="amber" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '150ms' }}><StatCard title="Terkirim" value={summary?.broadcast.sent ?? '-'} icon={<CheckCircle2 className="h-5 w-5" />} color="blue" /></div>
          </>
        )}
      </div>

      {(summary?.shared_data?.total_shared ?? 0) > 0 && summary?.shared_data && (
        <div className="animate-slide-up rounded-2xl border border-cyan-200/60 bg-gradient-to-r from-cyan-50 to-blue-50 p-5 shadow-sm dark:border-cyan-800/40 dark:from-cyan-950/30 dark:to-blue-950/30">
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
        </div>
      )}

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
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}><StatCard title="Pending" value={summary?.broadcast.pending ?? '-'} icon={<Clock className="h-5 w-5" />} color="yellow" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '250ms' }}><StatCard title="Processing" value={summary?.broadcast.processing ?? '-'} icon={<Loader2 className="h-5 w-5" />} color="blue" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '300ms' }}><StatCard title="Sukses" value={summary?.broadcast.sent ?? '-'} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" /></div>
            <div className="animate-slide-up" style={{ animationDelay: '350ms' }}><StatCard title="Gagal" value={summary?.broadcast.failed ?? '-'} icon={<XCircle className="h-5 w-5" />} color="red" /></div>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="mb-0">
          <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fif-500" />
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
              <span className="pl-7 font-semibold tabular-nums text-slate-700 dark:text-slate-200">{completionPct}%</span>
              <span className="text-slate-400 dark:text-slate-500">
                {summary?.broadcast.total ?? 0} / {summary?.assigned_count ?? 0} pelanggan
              </span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fif-500 via-fif-400 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
              <Activity className="h-5 w-5 text-fif-500" />
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
                <Badge variant={statusVariant(summary.last_broadcast.status)}>
                  {summary.last_broadcast.status}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Belum ada broadcast</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
              <Users className="h-5 w-5 text-fif-500" />
              Ringkasan
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-800/40">
              <p className="font-satoshi text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{summary?.broadcast.sent ?? 0}</p>
              <p className="mt-1 text-xs font-medium text-emerald-600/60 dark:text-emerald-400/60">Terkirim</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center ring-1 ring-red-100 dark:bg-red-950/40 dark:ring-red-800/40">
              <p className="font-satoshi text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">{summary?.broadcast.failed ?? 0}</p>
              <p className="mt-1 text-xs font-medium text-red-600/60 dark:text-red-400/60">Gagal</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center ring-1 ring-amber-100 dark:bg-amber-950/40 dark:ring-amber-800/40">
              <p className="font-satoshi text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{summary?.broadcast.pending ?? 0}</p>
              <p className="mt-1 text-xs font-medium text-amber-600/60 dark:text-amber-400/60">Pending</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-4 text-center ring-1 ring-purple-100 dark:bg-purple-950/40 dark:ring-purple-800/40">
              <p className="font-satoshi text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{summary?.not_broadcast_count ?? 0}</p>
              <p className="mt-1 text-xs font-medium text-purple-600/60 dark:text-purple-400/60">Belum dikerjakan</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="!font-display !font-extrabold !tracking-[0.05em] flex items-center gap-2">
            <Activity className="h-5 w-5 text-fif-500" />
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
                  <tr key={item.id} className="transition-colors duration-150 hover:bg-fif-50/40 dark:hover:bg-fif-950/20">
                    <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">{item.customer_name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
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
    </div>
  );
}
