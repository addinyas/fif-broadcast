'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, FileDown, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { customerService } from '@/services/customerService';
import type { Customer } from '@/types';
import api from '@/services/api';
import { useToast } from '@/components/ui/Toast';
import ProspectPieCharts from './ProspectPieCharts';

const SCORE_LABEL: Record<number, { label: string; color: string }> = {
  25: { label: '25%', color: 'bg-red-500/15 text-red-600' },
  50: { label: '50%', color: 'bg-amber-500/15 text-amber-600' },
  75: { label: '75%', color: 'bg-emerald-500/15 text-emerald-600' },
  100: { label: '100%', color: 'bg-fif-500/15 text-fif-600' },
};

export default function ProspectReportPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [score, setScore] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: '50', page: String(page) };
      if (score) params.prospect_score = score;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (search) params.search = search;
      const res = await customerService.getProspectHistory(params);
      setCustomers(res.data);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      toast('error', 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [score, dateFrom, dateTo, search, page, toast]);

  useEffect(() => { load(); }, [load]);

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (score) params.prospect_score = score;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (search) params.search = search;
      const { data } = await api.get('/admin/reports/prospect-history/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospect-history-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast('success', 'Export berhasil');
    } catch {
      toast('error', 'Gagal export');
    } finally {
      setExporting(false);
    }
  };

  const reset = () => { setScore(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Laporan Prospect</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Riwayat skor prospect 25/50/75/100% ({total} customer)
          </p>
        </div>
        <button
          type="button"
          onClick={exportXlsx}
          disabled={exporting}
          className="flex items-center gap-2 rounded-xl bg-fif-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fif-700 disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export Excel
        </button>
      </div>

      <ProspectPieCharts />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Cari nama / no HP / kontrak"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800"
        />
        <select
          value={score}
          onChange={(e) => { setScore(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="">Semua Skor</option>
          <option value="25">25%</option>
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800"
        />
        <span className="text-xs text-slate-400">s/d</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <RefreshCw className="h-4 w-4" /> Reset
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800/90">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>
        ) : customers.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-400">Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-700/50">
                  <th className="px-5 py-3">No Contract</th>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">No HP</th>
                  <th className="px-5 py-3">Skor</th>
                  <th className="px-5 py-3">Tipe</th>
                  <th className="px-5 py-3">Marketing</th>
                  <th className="px-5 py-3">Tanggal Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {customers.map((c) => {
                  const meta = c.prospect_score != null ? SCORE_LABEL[c.prospect_score] : null;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.no_contract ?? '—'}</td>
                      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">{c.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.phone_number}</td>
                      <td className="px-5 py-3">
                        {meta ? (
                          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                        ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{c.nmc_refi_flag ?? '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{c.marketing?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-xs tabular-nums text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
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
