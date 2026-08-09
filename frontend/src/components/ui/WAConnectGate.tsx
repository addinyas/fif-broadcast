'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, WifiOff, X, Hash, QrCode, Loader2 } from 'lucide-react';
import { getSocket } from '@/services/socketService';
import { useAuth } from '@/context/AuthContext';

export function WAConnectGate() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState<string | null>(null);
  const [reconnectMsg, setReconnectMsg] = useState('');
  const [connectMode, setConnectMode] = useState<'qr' | 'code'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = (msg: { status: string; qr?: string; message?: string }) => {
      if (msg.status === 'connected') {
        setOpen(false);
        return;
      }
      if (msg.status === 'disconnected' || msg.status === 'logged_out') {
        setOpen(true);
        setQr(null);
        setPairingCode(null);
        setPairingError(null);
      }
      if (msg.status === 'awaiting_scan') {
        setOpen(true);
        if (msg.qr) setQr(msg.qr);
      }
      if (msg.status === 'reconnecting') {
        setReconnectMsg(msg.message || 'Menghubungkan...');
      } else {
        setReconnectMsg('');
      }
      setStatus(msg.status);
    };

    const pairingHandler = (msg: { code?: string; error?: string }) => {
      setPairingLoading(false);
      if (msg.error) {
        setPairingError(msg.error);
        setPairingCode(null);
      } else if (msg.code) {
        setPairingCode(msg.code);
        setPairingError(null);
        setStatus('awaiting_scan');
      }
    };

    socket.on('wa:status', handler);
    socket.on('wa:pairing_code', pairingHandler);
    return () => {
      socket.off('wa:status', handler);
      socket.off('wa:pairing_code', pairingHandler);
    };
  }, [token]);

  useEffect(() => {
    if (qr && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qr, { width: 220, margin: 2 }, (err) => {
        if (err) console.error('QR render error:', err);
      });
    }
  }, [qr]);

  const handleReconnect = () => {
    const socket = getSocket();
    setQr(null);
    setPairingCode(null);
    setPairingError(null);
    socket.emit('wa:reconnect');
  };

  const handlePairing = () => {
    let clean = phoneNumber.replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      setPairingError('Masukkan nomor telepon yang valid');
      return;
    }
    if (clean.startsWith('08')) clean = '62' + clean.slice(1);
    else if (clean.startsWith('8')) clean = '62' + clean;
    const socket = getSocket();
    setPairingError(null);
    setPairingCode(null);
    setPairingLoading(true);
    socket.emit('wa:request_pairing_code', { phoneNumber: clean });
  };

  if (!open) return null;

  const showQR = status === 'awaiting_scan' && Boolean(qr);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/10">
            <WifiOff className="h-5 w-5" />
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">WhatsApp Terputus</h2>

        {showQR || pairingCode ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {connectMode === 'qr'
              ? 'Buka WhatsApp di ponsel → Linked Devices → Scan QR'
              : 'Masukkan kode berikut di WhatsApp Anda'}
          </p>
        ) : reconnectMsg ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {reconnectMsg}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            WhatsApp kamu tidak terhubung. Broadcast & balasan tidak bisa dikirim sampai dihubungkan ulang.
          </p>
        )}

        <div className="mt-4 mb-4 flex rounded-xl bg-slate-50 p-1 dark:bg-slate-700/50">
          <button
            type="button"
            onClick={() => { setConnectMode('qr'); setPairingCode(null); setPairingError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              connectMode === 'qr'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <QrCode className="h-4 w-4" /> QR Code
          </button>
          <button
            type="button"
            onClick={() => { setConnectMode('code'); setQr(null); setPairingError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              connectMode === 'code'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Hash className="h-4 w-4" /> Kode Pairing
          </button>
        </div>

        {connectMode === 'qr' && showQR && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 shadow-inner dark:from-slate-700/50 dark:to-slate-800">
              <canvas ref={canvasRef} className="block rounded-lg" />
            </div>
          </div>
        )}

        {connectMode === 'code' && (
          <div className="space-y-3">
            {!pairingCode ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="08xxxxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setPairingError(null); }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-fif-400 focus:bg-white focus:ring-2 focus:ring-fif-500/10 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:focus:border-fif-500 dark:focus:bg-slate-700"
                    onKeyDown={(e) => e.key === 'Enter' && !pairingLoading && handlePairing()}
                    disabled={pairingLoading}
                  />
                  <button
                    type="button"
                    onClick={handlePairing}
                    disabled={!phoneNumber || phoneNumber.length < 8 || pairingLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-fif-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fif-700 disabled:opacity-50"
                  >
                    {pairingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Dapatkan Kode
                  </button>
                </div>
                {pairingError && <p className="text-sm text-red-500">{pairingError}</p>}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-2xl bg-gradient-to-br from-fif-50 to-fif-100/50 px-8 py-5 text-center dark:from-fif-900/30 dark:to-fif-900/10">
                  <p className="font-mono text-3xl font-bold tracking-[0.3em] text-fif-600 dark:text-fif-400">{pairingCode}</p>
                </div>
                <p className="text-xs text-slate-400">Kode akan expired dalam beberapa menit</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          {!showQR && !pairingCode && (
            <button
              type="button"
              onClick={handleReconnect}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fif-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-fif-700"
            >
              <Smartphone className="h-4 w-4" />
              Hubungkan Sekarang
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            {showQR || pairingCode ? 'Tutup' : 'Nanti'}
          </button>
        </div>
      </div>
    </div>
  );
}
