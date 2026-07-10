import { useState, useEffect } from 'react';
import { Radio, MessageSquare } from 'lucide-react';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

export function BroadcastStatusBanner() {
  const [status, setStatus] = useState<{ message: string; status: 'success' | 'error' | 'info' } | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = (msg: { customer_id: number; status: string }) => {
      setStatus({ message: `Broadcast ${msg.status}`, status: msg.status === 'sent' ? 'success' : msg.status === 'failed' ? 'error' : 'info' });
      setTimeout(() => setStatus(null), 5000);
    };

    socket.on('broadcast:status', handler);

    return () => { socket.off('broadcast:status', handler); };
  }, [token]);

  if (!status) return null;

  const config = {
    success: { bg: 'bg-emerald-500', icon: <MessageSquare className="h-4 w-4" /> },
    error: { bg: 'bg-red-500', icon: <MessageSquare className="h-4 w-4" /> },
    info: { bg: 'bg-fif-500', icon: <Radio className="h-4 w-4" /> },
  };

  const c = config[status.status];

  return (
    <div className={`flex items-center gap-2.5 px-6 py-2 text-sm font-medium text-white shadow-sm ${c.bg}`}>
      {c.icon}
      <span>{status.message}</span>
    </div>
  );
}
