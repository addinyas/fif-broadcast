import { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, Wifi, WifiOff, RefreshCw, Clock, Zap } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socketService';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

interface WaUser {
  id: number;
  name: string;
  role: string;
  kios_name: string | null;
  wa_status: string;
  last_status_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; pulse: string }> = {
  connected: { label: 'Connected', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30', pulse: 'bg-emerald-500' },
  awaiting_scan: { label: 'Menunggu Scan', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30', pulse: 'bg-amber-500' },
  reconnecting: { label: 'Reconnecting', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30', pulse: 'bg-blue-500' },
  logged_out: { label: 'Logged Out', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30', pulse: 'bg-red-500' },
  disconnected: { label: 'Offline', color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50', pulse: 'bg-slate-400' },
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  UH: 'UH',
  marketing: 'MCE',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '-';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 10) return 'baru saja';
  if (diff < 60) return `${diff} dtk lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export function WhatsappMonitorPage() {
  const [users, setUsers] = useState<WaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: WaUser[] }>('admin/whatsapp-status');
      setUsers(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Real-time tick for "x lalu" display
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(Date.now()), 5000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = getSocket();

    const handleGlobalStatus = (data: { userId: number; status: string; message: string }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === data.userId
            ? { ...u, wa_status: data.status, last_status_at: new Date().toISOString() }
            : u
        )
      );
    };

    socket.on('wa:global_status', handleGlobalStatus);
    return () => { socket.off('wa:global_status', handleGlobalStatus); };
  }, []);

  const connectedCount = users.filter((u) => u.wa_status === 'connected').length;
  const scanCount = users.filter((u) => u.wa_status === 'awaiting_scan').length;
  const offlineCount = users.filter((u) => u.wa_status === 'disconnected' || u.wa_status === 'logged_out').length;
  const totalMarketing = users.filter((u) => u.role === 'marketing').length;

  // Group by kios
  const byKios = users.reduce<Record<string, WaUser[]>>((acc, u) => {
    const key = u.kios_name || 'Tanpa Kios';
    (acc[key] ??= []).push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">WA Monitor</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Status real-time semua koneksi WhatsApp</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchStatus(); }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Connected" value={connectedCount} icon={<Wifi className="h-5 w-5" />} color="green" />
        <StatCard title="Menunggu Scan" value={scanCount} icon={<Smartphone className="h-5 w-5" />} color="amber" />
        <StatCard title="Offline" value={offlineCount} icon={<WifiOff className="h-5 w-5" />} color="red" />
        <StatCard title="Total Marketing" value={totalMarketing} icon={<Zap className="h-5 w-5" />} color="blue" />
      </div>

      {/* Status table grouped by kios */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><Skeleton className="h-24" /></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byKios).map(([kiosName, kiosUsers]) => {
            const kiosConnected = kiosUsers.filter((u) => u.wa_status === 'connected').length;
            return (
              <Card key={kiosName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="!text-base">{kiosName}</CardTitle>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {kiosConnected}/{kiosUsers.length} connected
                    </span>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700/50">
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Role</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Terakhir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kiosUsers.map((u) => {
                        const cfg = STATUS_CONFIG[u.wa_status] || STATUS_CONFIG.disconnected;
                        return (
                          <tr
                            key={u.id}
                            className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30"
                          >
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {ROLE_LABEL[u.role] || u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${cfg.pulse} ${u.wa_status === 'connected' ? 'animate-pulse' : ''}`} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                              {timeAgo(u.last_status_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
