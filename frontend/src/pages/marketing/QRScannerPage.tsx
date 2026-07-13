import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, Wifi, WifiOff, AlertTriangle, RefreshCw, Unlink, Loader2, Hash, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';

export function QRScannerPage() {
  const [waQR, setWaQR] = useState<string | null>(null);
  const [waStatus, setWaStatus] = useState<string>('disconnected');
  const [reconnecting, setReconnecting] = useState(false);
  const [connectMode, setConnectMode] = useState<'qr' | 'code'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    api.get('/whatsapp/status').then((res) => {
      setWaStatus(res.data.status);
      if (res.data.qr_code) setWaQR(res.data.qr_code);
    }).catch(() => {});

    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handleWAStatus = (msg: { status: string; qr?: string }) => {
      setWaStatus(msg.status);
      setReconnecting(false);
      if (msg.qr) setWaQR(msg.qr);
      if (msg.status === 'connected' || msg.status === 'logged_out') {
        setWaQR(null);
        setPairingCode(null);
      }
    };

    const handlePairingCode = (msg: { code?: string; error?: string; message?: string }) => {
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

    socket.emit('wa:request_status');

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
    setWaQR(null);
    setPairingCode(null);
    socket.emit('wa:reconnect');
  }, []);

  const handleRequestPairingCode = useCallback(() => {
    const clean = phoneNumber.replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      setPairingError('Masukkan nomor telepon yang valid');
      return;
    }
    const socket = getSocket();
    setPairingError(null);
    setPairingCode(null);
    socket.emit('wa:request_pairing_code', { phoneNumber: clean });
  }, [phoneNumber]);

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    connected: { icon: <Wifi className="h-5 w-5" />, label: 'Terhubung', variant: 'success' },
    awaiting_scan: { icon: <Smartphone className="h-5 w-5" />, label: 'Scan QR dengan WhatsApp Anda', variant: 'warning' },
    reconnecting: { icon: <Loader2 className="h-5 w-5 animate-spin" />, label: 'Menghubungkan kembali...', variant: 'info' },
    logged_out: { icon: <WifiOff className="h-5 w-5" />, label: 'Terputus — scan ulang QR untuk menghubungkan', variant: 'danger' },
    disconnected: { icon: <AlertTriangle className="h-5 w-5" />, label: 'Menunggu koneksi...', variant: 'info' },
  };

  const effectiveStatus = reconnecting ? 'reconnecting' : waStatus;
  const cfg = statusConfig[effectiveStatus] || statusConfig.disconnected;

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      <div>
        <h1 className="bg-gradient-to-r from-fif-600 to-fif-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Connect WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hubungkan WhatsApp pribadi Anda untuk mengirim broadcast</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-fif-600" />
            Status WhatsApp
          </CardTitle>
        </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-800/80">
              <span className={`${effectiveStatus === 'connected' ? 'text-emerald-500' : effectiveStatus === 'awaiting_scan' ? 'text-amber-500' : effectiveStatus === 'logged_out' ? 'text-red-500' : 'text-slate-400'}`}>
                {cfg.icon}
              </span>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>

            {effectiveStatus !== 'connected' && effectiveStatus !== 'logged_out' && (
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={() => { setConnectMode('qr'); setPairingCode(null); setPairingError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    connectMode === 'qr' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <QrCode className="h-4 w-4" /> QR Code
                </button>
                <button
                  onClick={() => { setConnectMode('code'); setWaQR(null); setPairingError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    connectMode === 'code' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <Hash className="h-4 w-4" /> Kode Pairing
                </button>
              </div>
            )}

            {connectMode === 'qr' && effectiveStatus === 'awaiting_scan' && waQR && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Buka WhatsApp di ponsel &gt; Tap titik tiga &gt; <strong>Linked Devices</strong> &gt; Scan QR
                </p>
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <canvas ref={canvasRef} />
                </div>
              </div>
            )}

            {connectMode === 'code' && effectiveStatus !== 'connected' && (
              <div className="space-y-3 py-2">
                {!pairingCode ? (
                  <>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Buka WhatsApp di ponsel &gt; Tap titik tiga &gt; <strong>Linked Devices</strong> &gt; <strong>Link with phone number</strong>
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="628xxxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setPairingError(null); }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleRequestPairingCode()}
                      />
                      <Button variant="primary" onClick={handleRequestPairingCode} disabled={!phoneNumber || phoneNumber.length < 8}>
                        Dapatkan Kode
                      </Button>
                    </div>
                    {pairingError && <p className="text-sm text-red-500">{pairingError}</p>}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Masukkan kode berikut di WhatsApp Anda:
                    </p>
                    <div className="rounded-xl border-2 border-dashed border-fif-200 bg-fif-50 px-8 py-6 text-center dark:border-fif-800 dark:bg-fif-900/20">
                      <p className="text-4xl font-bold tracking-[0.3em] text-fif-600 dark:text-fif-400 font-mono">{pairingCode}</p>
                    </div>
                    <p className="text-xs text-slate-400">Kode akan expired dalam beberapa menit</p>
                  </div>
                )}
              </div>
            )}

            {effectiveStatus === 'connected' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">WhatsApp sudah terhubung</p>
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Broadcast siap dikirim dari nomor Anda</p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="danger" icon={<Unlink className="h-4 w-4" />} onClick={handleDisconnect}>
                    Putuskan Tautan
                  </Button>
                </div>
              </div>
            )}

            {effectiveStatus === 'logged_out' && (
              <div className="flex justify-center gap-3">
                <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={handleForceReconnect} disabled={reconnecting}>
                  Reconnect
                </Button>
              </div>
            )}

            {effectiveStatus === 'disconnected' && (
              <div className="flex justify-center">
                <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={handleForceReconnect} disabled={reconnecting}>
                  Coba Hubungkan
                </Button>
              </div>
            )}
          </div>
      </Card>
    </div>
  );
}
