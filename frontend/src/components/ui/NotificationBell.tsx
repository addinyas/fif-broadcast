import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCircle2, XCircle, Loader2, Trash2 } from 'lucide-react';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

interface Notification {
  id: string;
  customerId: number;
  status: 'sent' | 'failed' | 'processing';
  time: number;
  read: boolean;
}

interface NotificationBellProps {
  variant?: 'default' | 'dark';
  placement?: 'left' | 'right';
}

const STORAGE_KEY = 'fif_notifications';
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

export function NotificationBell({ variant = 'default', placement = 'right' }: NotificationBellProps) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const aggregateStats = {
    sent: notifications.filter((n) => n.status === 'sent').length,
    failed: notifications.filter((n) => n.status === 'failed').length,
  };

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = (msg: { customer_id: number; status: string }) => {
      if (msg.status !== 'sent' && msg.status !== 'failed') return;
      const item: Notification = {
        id: `${msg.customer_id}-${Date.now()}`,
        customerId: msg.customer_id,
        status: msg.status as 'sent' | 'failed',
        time: Date.now(),
        read: false,
      };
      setNotifications((prev) => {
        const next = [item, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(next);
        return next;
      });
    };

    socket.on('broadcast:status', handler);
    return () => { socket.off('broadcast:status', handler); };
  }, [token]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = window.innerWidth < 640 ? 320 : 384;
    const gap = 8;

    let left: number;
    if (placement === 'left') {
      left = rect.left;
    } else {
      left = rect.right - panelWidth;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

    setPanelPos({
      top: rect.bottom + gap,
      left,
    });
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && unreadCount > 0) {
      const timer = setTimeout(markAllRead, 2000);
      return () => clearTimeout(timer);
    }
  }, [open, unreadCount, markAllRead]);

  const isDark = variant === 'dark';

  const buttonColors = isDark
    ? 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200';

  const statusConfig = {
    sent: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: 'Terkirim' },
    failed: { icon: <XCircle className="h-4 w-4 text-red-500" />, label: 'Gagal' },
    processing: { icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />, label: 'Diproses' },
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all active:scale-95 ${buttonColors}`}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-md ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="fixed z-[60] w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-700/80 dark:bg-slate-800 sm:w-96"
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700/80">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-fif-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-fif-600 transition-colors hover:bg-fif-50 dark:text-fif-400 dark:hover:bg-fif-900/20"
                    >
                      Baca semua
                    </button>
                    <button
                      onClick={clearAll}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Hapus semua"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-4 border-b border-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> {aggregateStats.sent} terkirim</span>
                {aggregateStats.failed > 0 && <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> {aggregateStats.failed} gagal</span>}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/50">
                    <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada notifikasi</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Notifikasi broadcast akan muncul di sini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {notifications.map((n) => {
                    const cfg = statusConfig[n.status];
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          n.read
                            ? 'bg-white dark:bg-slate-800'
                            : 'bg-fif-50/40 dark:bg-fif-950/20'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            Pesan <span className="font-semibold">{cfg.label}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                            Customer #{n.customerId} &middot; {timeAgo(n.time)}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fif-500 shadow-sm shadow-fif-500/50" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
