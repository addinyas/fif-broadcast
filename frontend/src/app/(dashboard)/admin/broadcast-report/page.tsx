'use client';

import { useEffect, useState } from 'react';
import { Loader2, BarChart3, MessageCircleReply, Send, TrendingUp } from 'lucide-react';
import { broadcastService } from '@/services/broadcastService';
import type { BroadcastReport } from '@/types';

const SCORE_COLORS: Record<number, string> = {
  25: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  50: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  75: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  100: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
};

const SCORE_LABELS: Record<number, string> = {
  25: 'Kurang',
  50: 'Biasa',
  75: 'Tertarik',
  100: 'Sangat Tertarik',
};

export default function BroadcastReportPage() {
  const [data, setData] = useState<BroadcastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    broadcastService.getBroadcastReport({ days: String(days) })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fif-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-400">
        Gagal memuat data broadcast report
      </div>
    );
  }

  const totalScored = Object.values(data.scores).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan Broadcast
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analisis respons dan klasifikasi prospek dari broadcast
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value={7}>7 hari</option>
          <option value={14}>14 hari</option>
          <option value={30}>30 hari</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Send className="h-3.5 w-3.5" /> Terkirim
          </p>
          <p className="font-satoshi mt-2 text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
            {data.total_sent}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <MessageCircleReply className="h-3.5 w-3.5" /> Dibalas
          </p>
          <p className="font-satoshi mt-2 text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
            {data.total_replied}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" /> Response Rate
          </p>
          <p className="font-satoshi mt-2 text-2xl font-bold tabular-nums text-fif-600 dark:text-fif-400">
            {data.response_rate}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <BarChart3 className="h-3.5 w-3.5" /> Terklasifikasi
          </p>
          <p className="font-satoshi mt-2 text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
            {totalScored}
          </p>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-100">
          Distribusi Klasifikasi
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[25, 50, 75, 100].map((score) => {
            const count = data.scores[String(score) as keyof typeof data.scores] ?? 0;
            const pct = totalScored > 0 ? Math.round((count / totalScored) * 100) : 0;
            return (
              <div key={score} className={`rounded-xl p-4 ${SCORE_COLORS[score]}`}>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="mt-0.5 text-xs font-semibold">{SCORE_LABELS[score]} ({score}%)</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-current opacity-40"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-medium opacity-70">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Broadcasts */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 p-5 dark:border-slate-700">
          <h3 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-100">
            Broadcast Terakhir
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Dikirim</th>
                <th className="px-5 py-3">Dibalas</th>
                <th className="px-5 py-3">Skor</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                    Belum ada broadcast dalam {days} hari terakhir
                  </td>
                </tr>
              ) : (
                data.recent.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 dark:border-slate-700/50 dark:hover:bg-slate-700/20">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {b.customer_name}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {b.sent_at ? new Date(b.sent_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {b.replied_at ? new Date(b.replied_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {b.prospect_score ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${SCORE_COLORS[b.prospect_score]}`}>
                          {b.prospect_score}%
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
