import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCircle2, XCircle, UserPlus, Upload, Trash2, ArrowLeftRight } from 'lucide-react';
import { getSocket } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { notificationService, type NotificationItem } from '../../services/notificationService';

interface NotificationBellProps {
  variant?: 'default' | 'dark';
  placement?: 'left' | 'right';
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

let audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1175, now + 0.1);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.3);
  } catch {
    // Web Audio not supported
  }
}

export function NotificationBell({ variant = 'default', placement = 'right' }: NotificationBellProps) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevUnreadRef = useRef(0);
  const initialLoadRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getAll();
      setNotifications(res.notifications);
      const newCount = res.unread_count;
      if (!initialLoadRef.current && newCount > prevUnreadRef.current) {
        playNotificationSound();
      }
      initialLoadRef.current = false;
      prevUnreadRef.current = newCount;
      setUnreadCount(newCount);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Poll setiap 10 detik untuk real-time
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Socket event untuk instant update
  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.auth = { token };
    socket.connect();

    const handler = () => { fetchNotifications(); };
    socket.on('notification:new', handler);
    return () => { socket.off('notification:new', handler); };
  }, [token, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch {
      // silent
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        prevUnreadRef.current = next;
        return next;
      });
    } catch {
      // silent
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await notificationService.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch {
      // silent
    }
  }, []);

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

    setPanelPos({ top: rect.bottom + gap, left });
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

  const isDark = variant === 'dark';

  const buttonColors = isDark
    ? 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200';

  const typeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'import': return <Upload className="h-4 w-4 text-violet-500" />;
      case 'rolling': return <ArrowLeftRight className="h-4 w-4 text-cyan-500" />;
      case 'broadcast': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
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

            <div className="max-h-80 overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/50">
                    <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada notifikasi</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Notifikasi akan muncul di sini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read_at && markAsRead(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                        n.read_at
                          ? 'bg-white dark:bg-slate-800'
                          : 'bg-fif-50/40 dark:bg-fif-950/20'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{n.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read_at && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fif-500 shadow-sm shadow-fif-500/50" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
