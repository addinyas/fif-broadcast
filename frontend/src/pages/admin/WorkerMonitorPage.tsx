import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, XCircle, Clock, CheckCircle2, AlertTriangle, Loader2, Filter, User, RefreshCw } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import type { WorkerStatus, WorkerUser } from '../../types';

export function WorkerMonitorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<WorkerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [kiosFilter, setKiosFilter] = useState<string>('all');
  const [marketingFilter, setMarketingFilter] = useState<string>('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchData = useCallback(async () => {
    try {
      const result = await broadcastService.getWorkerStatus();
      setData(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  // Real-time: listen for broadcast:global_status from worker
  useEffect(() => {
    const socket = getSocket();
    const handler = () => { fetchData(); };
    socket.on('broadcast:global_status', handler);
    return () => { socket.off('broadcast:global_status', handler); };
  }, [fetchData]);

  const handleCancelItem = async (id: number) => {
    if (!confirm('Batalkan pesan ini?')) return;
    setCancellingId(id);
    try {
      await broadcastService.cancelItem(id);
      toast('success', 'Pesan dibatalkan');
      fetchData();
    } catch {
      toast('error', 'Gagal membatalkan pesan');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelAll = async () => {
    if (!confirm('Batalkan SEMUA pesan yang masih pending?')) return;
    setCancellingAll(true);
    try {
      await broadcastService.cancelPending();
      toast('success', 'Semua pesan pending dibatalkan');
      fetchData();
    } catch {
      toast('error', 'Gagal membatalkan pesan');
    } finally {
      setCancellingAll(false);
    }
  };

  // Get unique kios list for superadmin filter
  const kiosList = data
    ? Array.from(new Map(data.users.filter((u) => u.kios_id).map((u) => [u.kios_id, { id: u.kios_id!, name: u.kios_name || u.kios_id! }])).values())
    : [];

  // Get marketing users for UH filter
  const marketingList = data
    ? data.users.map((u) => ({ id: u.marketing_id, name: u.marketing_name }))
    : [];

  // Filter users
  const filteredUsers = data
    ? data.users.filter((u) => {
        if (kiosFilter !== 'all' && u.kios_id !== kiosFilter) return false;
        if (marketingFilter !== 'all' && String(u.marketing_id) !== marketingFilter) return false;
        return true;
      })
    : [];

  // Filter pending items
  const filteredPending = data
    ? data.pending_items.filter((item) => {
        if (marketingFilter !== 'all' && String(item.marketing_id) !== marketingFilter) return false;
        if (kiosFilter !== 'all') {
          const u = data.users.find((u) => u.marketing_id === item.marketing_id);
          if (u && u.kios_id !== kiosFilter) return false;
        }
        return true;
      })
    : [];

  const isActive = data && (data.summary.total_pending > 0 || data.summary.total_processing > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-fif-800 to-fif-600 p-6 text-white shadow-xl shadow-fif-900/30 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.03]" />
        <div className="absolute right-0 top-0 h-px w-2/3 bg-gradient-to-r from-white/20 to-transparent" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Monitor Worker
            </h1>
            <p className="mt-2 max-w-xl text-sm text-fif-200/70">
              {user?.role === 'superadmin' && 'Pantau status antrian broadcast semua user. Filter berdasarkan kios.'}
              {user?.role === 'UH' && 'Pantau status antrian broadcast di kios Anda. Filter berdasarkan marketing.'}
              {user?.role === 'marketing' && 'Pantau status antrian broadcast akun Anda.'}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Live indicator */}
        {isActive && (
          <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Sedang memproses
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Menunggu"
          value={data?.summary.total_pending ?? 0}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
          sub="dalam antrian"
        />
        <SummaryCard
          label="Diproses"
          value={data?.summary.total_processing ?? 0}
          icon={<Activity className="h-4 w-4" />}
          color="blue"
          sub="sedang dikirim"
        />
        <SummaryCard
          label="Terkirim Hari Ini"
          value={data?.summary.total_sent_today ?? 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="green"
          sub="pesan"
        />
        <SummaryCard
          label="Gagal Hari Ini"
          value={data?.summary.total_failed_today ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
          sub="pesan"
        />
      </div>

      {/* Filters */}
      {(user?.role === 'superadmin' || user?.role === 'UH') && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filter:</span>
            </div>
            {user?.role === 'superadmin' && (
              <select
                value={kiosFilter}
                onChange={(e) => { setKiosFilter(e.target.value); setMarketingFilter('all'); }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700"
              >
                <option value="all">Semua Kios</option>
                {kiosList.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            )}
            <select
              value={marketingFilter}
              onChange={(e) => setMarketingFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:border-slate-600 dark:bg-slate-700"
            >
              <option value="all">Semua Marketing</option>
              {marketingList.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.name}</option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Users table */}
      <Card padding={false}>
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-200">
              Status Per User
            </h2>
            <span className="text-xs text-slate-400">{filteredUsers.length} user</span>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            Tidak ada data untuk filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-700/50 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">User</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">Kios</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-amber-500 text-center">Antrian</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-blue-500 text-center">Proses</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500 text-center">Terkirim</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-red-500 text-center">Gagal</th>
                  <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredUsers.map((u) => (
                  <UserRow key={u.marketing_id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pending items list */}
      {filteredPending.length > 0 && (
        <Card padding={false}>
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-200">
                Pesan Pending ({filteredPending.length})
              </h2>
              <button
                onClick={handleCancelAll}
                disabled={cancellingAll}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                {cancellingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Batal Semua
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredPending.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{item.customer_name}</p>
                  <p className="text-xs text-slate-400">{item.marketing_name}</p>
                </div>
                <button
                  onClick={() => handleCancelItem(item.id)}
                  disabled={cancellingId === item.id}
                  className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  {cancellingId === item.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  Batal
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!isActive && data && data.users.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Tidak ada antrian aktif</p>
          <p className="mt-1 text-xs text-slate-400">Semua pesan sudah diproses atau belum ada broadcast.</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, color, sub }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'amber' | 'blue' | 'green' | 'red';
  sub: string;
}) {
  const colorMap = {
    amber: { border: 'border-l-amber-500', icon: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    blue: { border: 'border-l-blue-500', icon: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    green: { border: 'border-l-emerald-500', icon: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    red: { border: 'border-l-red-500', icon: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  };
  const cfg = colorMap[color];

  return (
    <div className={`rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-800 ${cfg.border}`} style={{ borderLeftWidth: '3px' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
          <p className="font-satoshi mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: WorkerUser }) {
  const isBusy = user.pending > 0 || user.processing > 0;
  const lastActivity = user.last_activity
    ? formatRelativeTime(new Date(user.last_activity))
    : '-';

  return (
    <tr className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20 ${isBusy ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fif-400 to-fif-600 text-xs font-bold text-white">
            {user.marketing_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{user.marketing_name}</p>
            <p className="text-xs text-slate-400">ID: {user.marketing_id}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
          <User className="h-3 w-3" />
          {user.kios_id || '-'}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`font-satoshi inline-block min-w-[24px] rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ${user.pending > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-400'}`}>
          {user.pending}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`font-satoshi inline-block min-w-[24px] rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ${user.processing > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400'}`}>
          {user.processing}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="font-satoshi text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {user.sent_today}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`font-satoshi text-sm font-bold tabular-nums ${user.failed_today > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
          {user.failed_today}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="text-xs text-slate-400">{lastActivity}</span>
      </td>
    </tr>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  return `${Math.floor(diffHour / 24)}h lalu`;
}
