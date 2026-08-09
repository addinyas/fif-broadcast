'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, WifiOff, X } from 'lucide-react';
import { getSocket } from '@/services/socketService';
import { useAuth } from '@/context/AuthContext';

export function WAConnectGate() {
  const [open, setOpen] = useState(false);
  const [qrAvailable, setQrAvailable] = useState(false);
  const { token, isAdmin } = useAuth();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = (msg: { status: string; qr?: string }) => {
      if (msg.status === 'disconnected' || msg.status === 'logged_out') {
        setQrAvailable(Boolean(msg.qr));
        setOpen(true);
      }
      if (msg.status === 'connected') {
        setOpen(false);
      }
    };

    socket.on('wa:status', handler);
    return () => { socket.off('wa:status', handler); };
  }, [token]);

  if (!open) return null;

  const connectPath = isAdmin ? '/admin/connect' : '/marketing/connect';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
            <WifiOff className="h-5 w-5" />
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">WhatsApp Terputus</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {qrAvailable
            ? 'QR sudah tersedia. Buka halaman Connect untuk memindai dan menghubungkan ulang WhatsApp.'
            : 'WhatsApp kamu tidak terhubung. Broadcast & balasan tidak bisa dikirim sampai dihubungkan ulang.'}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <Link
            href={connectPath}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fif-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fif-700"
          >
            <Smartphone className="h-4 w-4" />
            Hubungkan Sekarang
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
