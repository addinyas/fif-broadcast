'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircleReply, Send } from 'lucide-react';
import { broadcastService } from '@/services/broadcastService';

interface Point {
  date: string;
  sent: number;
  replied: number;
  response_rate: number;
}

export default function ResponseRatePanel() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    broadcastService.getResponseRate({ days: '14' })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>;
  }

  const avg = data.length > 0 ? data.reduce((s, d) => s + d.response_rate, 0) / data.length : 0;
  const totalSent = data.reduce((s, d) => s + d.sent, 0);
  const totalReplied = data.reduce((s, d) => s + d.replied, 0);
  const maxSent = Math.max(1, ...data.map((d) => d.sent));
  const today = data[data.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
      <div className="flex items-center justify-between">
        <h3 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-100">Response Rate Broadcast</h3>
        <span className="rounded-lg bg-fif-50 px-2 py-0.5 text-xs font-bold text-fif-700 dark:bg-fif-500/10 dark:text-fif-400">
          14 hari terakhir
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/30">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <Send className="h-3 w-3" /> Terkirim
          </p>
          <p className="font-satoshi mt-1 text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{totalSent}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/30">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <MessageCircleReply className="h-3 w-3" /> Dibalas
          </p>
          <p className="font-satoshi mt-1 text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{totalReplied}</p>
        </div>
        <div className="rounded-xl bg-fif-50 p-3 dark:bg-fif-500/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fif-600/70 dark:text-fif-400/70">Rata-rata</p>
          <p className="font-satoshi mt-1 text-xl font-bold tabular-nums text-fif-700 dark:text-fif-400">{avg.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-5 flex h-36 items-end gap-1.5">
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.sent / maxSent) * 100));
          return (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.sent} terkirim, ${d.replied} dibalas (${d.response_rate}%)`}>
              <div className="flex w-full items-end justify-center gap-0.5">
                <div className="w-1/3 rounded-t bg-fif-200 transition-all dark:bg-fif-500/30" style={{ height: `${Math.max(2, h * 0.6)}px` }} />
                <div className="w-1/3 rounded-t bg-emerald-500/80 transition-all" style={{ height: `${Math.max(2, (d.replied / maxSent) * 100)}px` }} />
              </div>
              <span className="text-[8px] font-medium text-slate-400">
                {d.date.slice(8)}
              </span>
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                {d.sent} kirim · {d.response_rate}% dibalas
              </div>
            </div>
          );
        })}
      </div>

      {today && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-700/50">
          Hari ini ({today.date}): <strong className="text-slate-600 dark:text-slate-300">{today.sent} terkirim</strong> ·{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">{today.replied} dibalas</strong> ·{' '}
          <strong className="text-fif-600 dark:text-fif-400">{today.response_rate}%</strong>
        </p>
      )}
    </div>
  );
}
