import { useState, useEffect, useRef } from 'react';
import { Radio, MessageSquare, WifiOff } from 'lucide-react';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

export function BroadcastStatusBanner() {
  const [counts, setCounts] = useState({ sent: 0, failed: 0, processing: 0 });
  const [lastStatus, setLastStatus] = useState<'success' | 'error' | 'info' | null>(null);
  const [pendingStuck, setPendingStuck] = useState(0);
  const { token } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = (msg: { customer_id: number; status: string }) => {
      setCounts((prev) => {
        if (msg.status === 'sent') return { ...prev, sent: prev.sent + 1, processing: Math.max(0, prev.processing - 1) };
        if (msg.status === 'failed') return { ...prev, failed: prev.failed + 1, processing: Math.max(0, prev.processing - 1) };
        return { ...prev, processing: prev.processing + 1 };
      });
      setLastStatus(msg.status === 'sent' ? 'success' : msg.status === 'failed' ? 'error' : 'info');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { setCounts({ sent: 0, failed: 0, processing: 0 }); setLastStatus(null); }, 8000);
    };

    const stuckHandler = (data: { pending_count: number }) => {
      setPendingStuck(data.pending_count);
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = setTimeout(() => setPendingStuck(0), 30000);
    };

    socket.on('broadcast:status', handler);
    socket.on('broadcast:pending_stuck', stuckHandler);

    return () => {
      socket.off('broadcast:status', handler);
      socket.off('broadcast:pending_stuck', stuckHandler);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    };
  }, [token]);

  const total = counts.sent + counts.failed + counts.processing;

  if (pendingStuck > 0) {
    return (
      <div className="relative z-30 flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-white shadow-sm sm:px-6 bg-red-500">
        <WifiOff className="h-4 w-4" />
        <span>WhatsApp terputus! {pendingStuck} pesan tertunda. <a href="/marketing/connect" className="underline">Hubungkan ulang</a></span>
      </div>
    );
  }

  if (total === 0 || !lastStatus) return null;

  const config = {
    success: { bg: 'bg-emerald-500', icon: <MessageSquare className="h-4 w-4" /> },
    error: { bg: 'bg-red-500', icon: <MessageSquare className="h-4 w-4" /> },
    info: { bg: 'bg-fif-500', icon: <Radio className="h-4 w-4" /> },
  };

  const c = config[lastStatus];

  return (
    <div className={`relative z-30 flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-white shadow-sm sm:px-6 ${c.bg}`}>
      {c.icon}
      <span>{counts.sent} terkirim{counts.failed > 0 ? `, ${counts.failed} gagal` : ''}{counts.processing > 0 ? `, ${counts.processing} diproses` : ''}</span>
    </div>
  );
}
