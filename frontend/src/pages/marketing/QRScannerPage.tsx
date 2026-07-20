import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, Wifi, WifiOff, AlertTriangle, RefreshCw, Unlink, Loader2, Hash, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';

export function QRScannerPage() {
  const [waQR, setWaQR] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [reconnecting, setReconnecting] = useState(false);
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

    const handleWAStatus = (msg: { status: string; qr?: string; message?: string }) => {
      if (msg.status === 'reconnecting') {
        setReconnectMsg(msg.message || 'Menghubungkan...');
      } else {
        setReconnecting(false);
        setReconnectMsg('');
      }
      setWaStatus(msg.status);
      if (msg.qr) setWaQR(msg.qr);
      if (msg.status === 'connected' || msg.status === 'logged_out') {
        setWaQR(null);
        setPairingCode(null);
      }
    };

    const handlePairingCode = (msg: { code?: string; error?: string; message?: string }) => {
      setPairingLoading(false);
      if (msg.error) {
        setPairingError(msg.error);
        setPairingCode(null);
      } else if (msg.code) {
        setPairingCode(msg.code);
        setPairingError(null);
        setWaStatus('awaiting_scan');
      }
    };

    socket.on('wa:status', handleWAStatus);
    socket.on('wa:pairing_code', handlePairingCode);

    const handleSocketError = (err: Error) => {
      console.error('Socket connection error:', err.message);
    };
    const handleDisconnect = (reason: string) => {
      console.warn('Socket disconnected:', reason);
    };

    socket.on('connect_error', handleSocketError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('wa:status', handleWAStatus);
      socket.off('wa:pairing_code', handlePairingCode);
      socket.off('connect_error', handleSocketError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [token]);

  useEffect(() => {
    if (waQR && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, waQR, { width: 280, margin: 2 }, (err) => {
        if (err) console.error('QR render error:', err);
      });
    }
  }, [waQR]);

  const handleDisconnect = useCallback(async () => {
    const socket = getSocket();
    socket.emit('wa:disconnect');
    setWaStatus('disconnected');
    setWaQR(null);
    try {
      await api.post('/whatsapp/disconnect');
    } catch {}
  }, []);

  const handleForceReconnect = useCallback(() => {
    const socket = getSocket();
    setReconnecting(true);
    setReconnectMsg('Menyiapkan koneksi...');
    setWaQR(null);
    setPairingCode(null);
    socket.emit('wa:reconnect');
  }, []);

  const handleRequestPairingCode = useCallback(() => {
    let clean = phoneNumber.replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      setPairingError('Masukkan nomor telepon yang valid');
      return;
    }
    if (clean.startsWith('08')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('62')) {
      // already correct
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    const socket = getSocket();
    setPairingError(null);
    setPairingCode(null);
    setPairingLoading(true);
    socket.emit('wa:request_pairing_code', { phoneNumber: clean });
  }, [phoneNumber]);

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    connected: { icon: <Wifi className="h-5 w-5" />, label: 'Terhubung', variant: 'success' },
    awaiting_scan: { icon: <Smartphone className="h-5 w-5" />, label: 'Scan QR dengan WhatsApp Anda', variant: 'warning' },
    reconnecting: { icon: <Loader2 className="h-5 w-5 animate-spin" />, label: reconnectMsg || 'Menghubungkan kembali...', variant: 'info' },
    logged_out: { icon: <WifiOff className="h-5 w-5" />, label: 'Terputus — scan ulang QR untuk menghubungkan', variant: 'danger' },
    disconnected: { icon: <AlertTriangle className="h-5 w-5" />, label: 'Menunggu koneksi...', variant: 'info' },
  };

  const effectiveStatus = reconnecting ? 'reconnecting' : waStatus;
  const cfg = statusConfig[effectiveStatus] || statusConfig.disconnected;

  const statusGlow: Record<string, string> = {
    connected: 'shadow-emerald-500/10 dark:shadow-emerald-500/5',
    awaiting_scan: 'shadow-amber-500/10 dark:shadow-amber-500/5',
    reconnecting: 'shadow-blue-500/10 dark:shadow-blue-500/5',
    logged_out: 'shadow-red-500/10 dark:shadow-red-500/5',
    disconnected: 'shadow-slate-500/5 dark:shadow-slate-500/5',
  };

  return (
    <div className="mx-auto max-w-lg space-y-5 animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-satoshi text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Connect <span className="bg-gradient-to-r from-fif-600 to-fif-500 bg-clip-text text-transparent">WhatsApp</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hubungkan akun WhatsApp Anda untuk mengirim broadcast</p>
      </div>

      <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-500 sm:p-6 dark:border-slate-700/80 dark:bg-slate-800 ${statusGlow[effectiveStatus] || ''}`}>
        <div className="mb-5 flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            effectiveStatus === 'connected'
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
              : effectiveStatus === 'awaiting_scan'
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
              : effectiveStatus === 'logged_out'
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
            {cfg.icon}
          </div>
          <div>
            <p className="font-subheading text-sm font-semibold text-slate-800 dark:text-slate-200">Status Koneksi</p>
            <Badge variant={cfg.variant} size="sm" pulse={effectiveStatus === 'reconnecting'}>{cfg.label}</Badge>
          </div>
        </div>

        {effectiveStatus !== 'connected' && effectiveStatus !== 'logged_out' && (
          <div className="mb-5 flex rounded-xl bg-slate-50 p-1 dark:bg-slate-700/50">
            <button
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
              onClick={() => { setConnectMode('code'); setWaQR(null); setPairingError(null); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                connectMode === 'code'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Hash className="h-4 w-4" /> Kode Pairing
            </button>
          </div>
        )}

        {connectMode === 'qr' && effectiveStatus === 'awaiting_scan' && waQR && (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Buka WhatsApp di ponsel &rarr; <strong>Linked Devices</strong> &rarr; Scan QR
            </p>
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 shadow-inner dark:from-slate-700/50 dark:to-slate-800">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fif-500/5 to-transparent" />
              <canvas ref={canvasRef} className="relative block rounded-lg" />
            </div>
          </div>
        )}

        {connectMode === 'code' && effectiveStatus !== 'connected' && (
          <div className="space-y-4 py-1">
            {!pairingCode ? (
              <>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Buka WhatsApp di ponsel &rarr; <strong>Linked Devices</strong> &rarr; <strong>Link with phone number</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="08xxxxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setPairingError(null); }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-fif-400 focus:bg-white focus:ring-2 focus:ring-fif-500/10 dark:border-slate-600 dark:bg-slate-700/50 dark:text-white dark:focus:border-fif-500 dark:focus:bg-slate-700"
                    onKeyDown={(e) => e.key === 'Enter' && !pairingLoading && handleRequestPairingCode()}
                    disabled={pairingLoading}
                  />
                  <Button variant="primary" onClick={handleRequestPairingCode} disabled={!phoneNumber || phoneNumber.length < 8 || pairingLoading} loading={pairingLoading}>
                    Dapatkan Kode
                  </Button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Format: 08xxx atau 628xxx — otomatis dikonversi</p>
                {pairingLoading && !pairingCode && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyiapkan koneksi ke WhatsApp...
                  </div>
                )}
                {pairingError && <p className="text-sm text-red-500">{pairingError}</p>}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Masukkan kode berikut di WhatsApp Anda:
                </p>
                <div className="relative rounded-2xl bg-gradient-to-br from-fif-50 to-fif-100/50 px-10 py-7 text-center dark:from-fif-900/30 dark:to-fif-900/10">
                  <p className="font-mono text-4xl font-bold tracking-[0.3em] text-fif-600 dark:text-fif-400">{pairingCode}</p>
                </div>
                <p className="text-xs text-slate-400">Kode akan expired dalam beberapa menit</p>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  onClick={() => { setPairingCode(null); setPairingError(null); }}
                >
                  Ganti Nomor / Kode Baru
                </Button>
              </div>
            )}
          </div>
        )}

        {effectiveStatus === 'connected' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-4 text-center ring-1 ring-emerald-200/50 dark:from-emerald-900/20 dark:to-emerald-900/10 dark:ring-emerald-800/50">
              <p className="font-subheading font-semibold text-emerald-800 dark:text-emerald-200">WhatsApp sudah terhubung</p>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Broadcast siap dikirim dari nomor Anda</p>
            </div>
            <div className="flex justify-center">
              <Button variant="danger" icon={<Unlink className="h-4 w-4" />} onClick={handleDisconnect}>
                Putuskan Tautan
              </Button>
            </div>
          </div>
        )}

        {effectiveStatus === 'logged_out' && (
          <div className="flex justify-center">
            <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={handleForceReconnect} disabled={reconnecting}>
              Reconnect
            </Button>
          </div>
        )}

        {effectiveStatus === 'disconnected' && !reconnecting && (
          <div className="flex justify-center">
            <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={handleForceReconnect}>
              Coba Hubungkan
            </Button>
          </div>
        )}

        {effectiveStatus === 'disconnected' && reconnecting && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            {reconnectMsg || 'Menyiapkan koneksi ke WhatsApp server...'}
          </div>
        )}
      </div>
    </div>
  );
}
