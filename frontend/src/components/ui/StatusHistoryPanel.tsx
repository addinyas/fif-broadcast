'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Inbox, Phone } from 'lucide-react';
import { broadcastService } from '@/services/broadcastService';
import type { BroadcastHistory } from '@/types';
import { StatusBadge } from './StatusBadge';

interface StatusHistoryPanelProps {
  status: string;
  keyRef?: number;
  perPage?: number;
}

function statusParam(status: string): string {
  if (status === 'pending') return 'pending_processing';
  return status;
}

function fmtTime(iso?: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function StatusHistoryPanel({ status, keyRef = 0, perPage = 15 }: StatusHistoryPanelProps) {
  const [items, setItems] = useState<BroadcastHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    broadcastService
      .getHistory({ status: statusParam(status), per_page: String(perPage), page: '1' })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setTotal(res.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, keyRef, perPage]);

  const loadMore = async () => {
    const next = page + 1;
    const res = await broadcastService.getHistory({
      status: statusParam(status),
      per_page: String(perPage),
      page: String(next),
    });
    setItems((prev) => [...prev, ...res.data]);
    setPage(next);
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada data untuk status ini</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {total} pesan · menampilkan {items.length}
          </p>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 400, damping: 35 }}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {item.customer?.name ?? `#${item.customer_id}`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {item.customer?.phone_number ?? '-'}
                      </span>
                      <span>oleh {item.marketing?.name ?? '-'}</span>
                    </div>
                    {item.exact_message && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.exact_message}
                      </p>
                    )}
                    {item.error_log && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-red-600 dark:text-red-400">{item.error_log}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={item.status} size="xs" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
                    </span>
                    {fmtTime(item.sent_at ?? item.created_at)}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
          {items.length < total && (
            <button
              onClick={loadMore}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Muat lebih banyak ({total - items.length} tersisa)
            </button>
          )}
        </>
      )}
    </div>
  );
}
