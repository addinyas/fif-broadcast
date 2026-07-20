import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Clock, Filter, User, Users, XCircle } from 'lucide-react';
import { broadcastService } from '../../services/broadcastService';
import { customerService } from '../../services/customerService';
import { authService } from '../../services/authService';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import type { BroadcastHistory, Kios } from '../../types';

type Tab = 'sent' | 'not_sent' | 'failed';

export function BroadcastHistoryPage() {
  const { user, token } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const isUH = user?.role === 'UH';
  const isAdmin = isSuperadmin || isUH;

  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [tab, setTab] = useState<Tab>('not_sent');
  const [marketingUsers, setMarketingUsers] = useState<{ id: number; name: string }[]>([]);
  const [selectedMarketingId, setSelectedMarketingId] = useState<number | ''>('');
  const [kiosList, setKiosList] = useState<Kios[]>([]);
  const [selectedKiosId, setSelectedKiosId] = useState<string>('');
  const [uhScope, setUhScope] = useState<'own' | 'all_kios'>('own');
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (isSuperadmin) {
      authService.getKios().then(setKiosList);
    }
  }, [isSuperadmin]);

  useEffect(() => {
    if (!isAdmin) return;
    customerService.getMarketingUsers(selectedKiosId || undefined).then(setMarketingUsers);
    if (!isUH) setSelectedMarketingId('');
  }, [isAdmin, selectedKiosId, isUH]);

  const fetchData = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: page.toString() };
      if (tab === 'sent') params.status = 'sent';
      if (tab === 'failed') params.status = 'failed';
      if (tab === 'not_sent') params.status = 'pending_processing';
      if (isSuperadmin && selectedKiosId) params.kios_id = selectedKiosId;
      if (isSuperadmin && selectedMarketingId) {
        params.marketing_id = selectedMarketingId.toString();
      } else if (isUH) {
        if (uhScope === 'all_kios') {
          params.marketing_id = 'all';
        }
      }
      const res = await broadcastService.getHistory(params);
      if (fetchId === fetchIdRef.current) {
        setHistory(res.data);
        setLastPage(res.last_page);
      }
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [page, tab, selectedMarketingId, selectedKiosId, isSuperadmin, isUH, uhScope]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = () => { fetchData(); };
    socket.on('broadcast:status', handler);
    return () => { socket.off('broadcast:status', handler); };
  }, [token, fetchData]);

  const statusVariant = (status: string): 'warning' | 'info' | 'success' | 'danger' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'sent': return 'success';
      case 'failed': return 'danger';
      case 'cancelled': return 'danger';
      default: return 'warning';
    }
  };

  const columns = [
    { key: 'customer', header: 'Customer', render: (b: BroadcastHistory) => b.customer?.name || `#${b.customer_id}` },
    {
      key: 'exact_message', header: 'Message', render: (b: BroadcastHistory) => (
        <div className="max-w-xs truncate text-slate-500 dark:text-slate-400">{b.exact_message}</div>
      )
    },
    {
      key: 'status', header: 'Status', render: (b: BroadcastHistory) => (
        <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
      )
    },
    {
      key: 'sent_at', header: 'Sent At', render: (b: BroadcastHistory) =>
        b.sent_at ? new Date(b.sent_at).toLocaleString() : '-'
    },
  ];

  const tabs: { key: Tab; label: string; icon: typeof Send }[] = [
    { key: 'not_sent', label: 'Belum Dikirim', icon: Clock },
    { key: 'sent', label: 'Terkirim', icon: Send },
    { key: 'failed', label: 'Gagal', icon: XCircle },
  ];

  return (
    <div className="font-poppins space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Broadcast History</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Riwayat pengiriman broadcast WhatsApp</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 backdrop-blur-sm dark:border-slate-600/80 dark:bg-slate-800/80">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-white text-fif-700 shadow-sm dark:bg-slate-700 dark:text-fif-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {(isUH || isSuperadmin) && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {isUH && (
            <div className="flex gap-1 rounded-lg border border-slate-200/80 bg-slate-100/80 p-1 backdrop-blur-sm dark:border-slate-600/80 dark:bg-slate-800/80">
              <button
                onClick={() => { setUhScope('own'); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  uhScope === 'own'
                    ? 'bg-white text-fif-700 shadow-sm dark:bg-slate-700 dark:text-fif-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Saya Saja
              </button>
              <button
                onClick={() => { setUhScope('all_kios'); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  uhScope === 'all_kios'
                    ? 'bg-white text-fif-700 shadow-sm dark:bg-slate-700 dark:text-fif-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Semua di Kios
              </button>
            </div>
          )}
          {isSuperadmin && kiosList.length > 0 && (
            <select
              value={selectedKiosId}
              onChange={(e) => { setSelectedKiosId(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
            >
              <option value="">Semua Kios</option>
              {kiosList.map((k) => (
                <option key={k.kios_id} value={k.kios_id}>{k.kios_name} ({k.kios_id})</option>
              ))}
            </select>
          )}
          {isSuperadmin && marketingUsers.length > 0 && (
            <select
              value={selectedMarketingId}
              onChange={(e) => { setSelectedMarketingId(e.target.value ? parseInt(e.target.value) : ''); setPage(1); }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 outline-none transition-all focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20"
            >
              <option value="">Semua Marketing</option>
              {marketingUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <DataTable columns={columns} data={history} loading={loading} />

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>Halaman {page} dari {lastPage}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-700">Sebelumnya</button>
          <button disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:hover:bg-slate-700">Selanjutnya</button>
        </div>
      </div>
    </div>
  );
}
