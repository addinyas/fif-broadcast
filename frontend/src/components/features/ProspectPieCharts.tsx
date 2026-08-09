'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { customerService, type ProspectSummary } from '@/services/customerService';

const SCORE_COLOR: Record<number, string> = {
  25: '#f87171',
  50: '#fbbf24',
  75: '#34d399',
  100: '#6366f1',
};

const SCORE_LABEL: Record<number, string> = {
  25: '25% (Tidak Minat)',
  50: '50% (Ragu)',
  75: '75% (Minat)',
  100: '100% (Sangat Minat)',
};

function DonutChart({ values, label, subtitle }: {
  values: Record<string, number>;
  label?: string;
  subtitle?: string;
}) {
  const total = Object.values(values).reduce((s, n) => s + n, 0);
  let acc = 0;
  const stops: string[] = [];
  for (const [score, count] of Object.entries(values)) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    if (pct === 0) continue;
    const start = (acc / total) * 360;
    const end = ((acc + count) / total) * 360;
    stops.push(`${SCORE_COLOR[Number(score)] ?? '#94a3b8'} ${start}deg ${end}deg`);
    acc += count;
  }

  return (
    <div className="flex items-center gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
      <div
        className="relative h-32 w-32 shrink-0 rounded-full"
        style={{ background: stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e2e8f0 0deg 360deg)' }}
      >
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white dark:bg-slate-800">
          <span className="font-satoshi text-xl font-bold text-slate-800 dark:text-white">{total}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total</span>
        </div>
      </div>
      <div>
        {label && <h3 className="font-subheading text-base font-semibold text-slate-800 dark:text-slate-100">{label}</h3>}
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        <div className="mt-3 space-y-1.5">
          {Object.entries(values).length === 0 && <p className="text-xs text-slate-400">Belum ada data skor</p>}
          {Object.entries(values).map(([score, count]) => (
            <div key={score} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SCORE_COLOR[Number(score)] ?? '#94a3b8' }} />
              <span className="text-slate-500 dark:text-slate-400">{SCORE_LABEL[Number(score)] ?? `${score}%`}</span>
              <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProspectPieCharts() {
  const [summary, setSummary] = useState<ProspectSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerService.getProspectSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-fif-600" /></div>;
  }

  const byMarketingEntries = Object.entries(summary?.by_marketing ?? {});

  return (
    <div className="space-y-6">
      <DonutChart
        values={summary?.by_score ?? {}}
        label="Distribusi Skor Prospect"
        subtitle="Keseluruhan customer"
      />

      {byMarketingEntries.length > 0 && (
        <div>
          <h3 className="font-subheading mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">Per Marketing</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {byMarketingEntries.map(([marketingId, values]) => (
              <DonutChart
                key={marketingId}
                values={values}
                label={summary?.marketing_names?.[marketingId] ?? `Marketing #${marketingId}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
