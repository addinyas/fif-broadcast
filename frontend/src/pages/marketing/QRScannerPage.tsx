import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, Wifi, WifiOff, AlertTriangle, RefreshCw, Unlink } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handleWAStatus = (msg: { status: string; qr?: string }) => {
      setWaStatus(msg.status);
      if (msg.qr) {
        setWaQR(msg.qr);
      }
    };

    socket.on('wa:status', handleWAStatus);

    return () => {
      socket.off('wa:status', handleWAStatus);
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

  const handleRefresh = () => {
    window.location.reload();
  };

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
    connected: { icon: <Wifi className="h-5 w-5" />, label: 'Terhubung', variant: 'success' },
    awaiting_scan: { icon: <Smartphone className="h-5 w-5" />, label: 'Scan QR dengan WhatsApp Anda', variant: 'warning' },
    logged_out: { icon: <WifiOff className="h-5 w-5" />, label: 'Terputus — scan ulang QR untuk menghubungkan', variant: 'danger' },
    disconnected: { icon: <AlertTriangle className="h-5 w-5" />, label: 'Menunggu koneksi...', variant: 'info' },
  };

  const cfg = statusConfig[waStatus] || statusConfig.disconnected;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200">Connect WhatsApp</h1>
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
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
              <span className={`${waStatus === 'connected' ? 'text-emerald-500' : waStatus === 'awaiting_scan' ? 'text-amber-500' : waStatus === 'logged_out' ? 'text-red-500' : 'text-slate-400'}`}>
                {cfg.icon}
              </span>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>

            {waStatus === 'awaiting_scan' && waQR && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Buka WhatsApp di ponsel &gt; Tap titik tiga &gt; <strong>Linked Devices</strong> &gt; Scan QR
                </p>
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <canvas ref={canvasRef} />
                </div>
              </div>
            )}

            {waStatus === 'connected' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">WhatsApp sudah terhubung</p>
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">Broadcast siap dikirim dari nomor Anda</p>
                </div>
                <div className="flex justify-center">
                  <Button variant="danger" icon={<Unlink className="h-4 w-4" />} onClick={handleDisconnect}>
                    Putuskan Tautan
                  </Button>
                </div>
              </div>
            )}

            {waStatus === 'logged_out' && (
              <div className="flex justify-center">
                <Button variant="primary" icon={<RefreshCw className="h-4 w-4" />} onClick={handleRefresh}>
                  Refresh untuk pairing ulang
                </Button>
              </div>
            )}
          </div>
      </Card>
    </div>
  );
}
