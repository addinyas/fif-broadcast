import { useState, useEffect, type ReactNode } from 'react';
import { Radio, MessageSquare, Smartphone, X } from 'lucide-react';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

interface StatusMessage {
  type: 'broadcast' | 'wa';
  message: string;
  status: 'success' | 'error' | 'info';
}

function WaAlert({ message, onClose }: { message: string; onClose: () => void }) {
  const labelMap: Record<string, string> = {
    awaiting_scan: 'Menunggu scan QR Code',
    connected: 'WhatsApp terhubung',
    logged_out: 'WhatsApp terputus',
  };

  const colorMap: Record<string, string> = {
    awaiting_scan: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800',
    connected: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800',
    logged_out: 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-800',
  };

  const iconMap: Record<string, ReactNode> = {
    awaiting_scan: <Smartphone className="h-5 w-5 text-amber-500" />,
    connected: <Radio className="h-5 w-5 text-emerald-500" />,
    logged_out: <Radio className="h-5 w-5 text-red-500" />,
  };

  const key = message.replace('WhatsApp ', '');
  const label = labelMap[key] || message;
  const colors = colorMap[key] || colorMap.awaiting_scan;
  const icon = iconMap[key] || iconMap.awaiting_scan;

  return (
    <div className={`fixed right-4 top-4 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg dark:shadow-slate-900/50 animate-toast-in ${colors}`}>
      {icon}
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
      <button
        onClick={onClose}
        className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 dark:text-slate-500 dark:hover:bg-slate-700/50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BroadcastStatusBanner() {
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    socket.on('broadcast:status', (msg: { customer_id: number; status: string }) => {
      setStatus({ type: 'broadcast', message: `Broadcast ${msg.status}`, status: msg.status === 'sent' ? 'success' : msg.status === 'failed' ? 'error' : 'info' });
      setTimeout(() => setStatus(null), 5000);
    });

    socket.on('wa:status', (msg: { status: string }) => {
      setStatus({ type: 'wa', message: `WhatsApp ${msg.status}`, status: 'info' });
    });

    return () => { socket.disconnect(); };
  }, [token]);

  if (!status) return null;

  if (status.type === 'wa') {
    return <WaAlert message={status.message} onClose={() => setStatus(null)} />;
  }

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
