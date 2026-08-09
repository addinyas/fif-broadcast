'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { auditService, type AuditLog } from '@/services/auditService';
import { useToast } from '@/components/ui/Toast';

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  logout: { label: 'Logout', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  broadcast_send: { label: 'Kirim Broadcast', color: 'bg-fif-50 text-fif-700 dark:bg-fif-500/10 dark:text-fif-400' },
  setting_update: { label: 'Ubah Setting', color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  schedule_create: { label: 'Tambah Jadwal', color: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
  schedule_update: { label: 'Edit Jadwal', color: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
  schedule_delete: { label: 'Hapus Jadwal', color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  rule_create: { label: 'Tambah Aturan', color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  rule_update: { label: 'Edit Aturan', color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  rule_delete: { label: 'Hapus Aturan', color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

export default function AuditLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: '50', page: String(page) };
      if (action) params.action = action;
      if (date) params.date = date;
      const res = await auditService.getLogs(params);
      setLogs(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      toast('error', 'Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [action, date, page, toast]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const reset = () => { setAction(''); setDate(''); setPage(1); };

  const roleBadge: Record<string, string> = {
    superadmin: 'bg-red-500/15 text-red-500',
    UH: 'bg-blue-500/15 text-blue-500',
    AO: 'bg-amber-500/15 text-amber-600',
    marketing: 'bg-emerald-500/15 text-emerald-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Audit Log</h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Riwayat login, pengiriman broadcast, dan perubahan pengaturan ({total} entri)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">Semua Aksi</option>
          {Object.entries(ACTION_LABEL).map(([value, meta]) => (
            <option key={value} value={value}>{meta.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800/90">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>
        ) : logs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <ShieldCheck className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Belum ada entri audit log</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-700/50">
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Aksi</th>
                  <th className="px-5 py-3">Detail</th>
                  <th className="px-5 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {logs.map((log) => {
                  const meta = ACTION_LABEL[log.action] ?? { label: log.action, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="whitespace-nowrap px-5 py-3 text-xs tabular-nums text-slate-500">
                        {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{log.user?.name ?? 'System'}</span>
                        {log.user && (
                          <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${roleBadge[log.user.role] ?? ''}`}>
                            {log.user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="max-w-md truncate px-5 py-3 text-xs text-slate-500" title={JSON.stringify(log.details)}>
                        {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-400">{log.ip_address ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Halaman {page} dari {lastPage}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
