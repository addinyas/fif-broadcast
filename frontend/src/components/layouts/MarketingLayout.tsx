'use client';

import { useState, useEffect } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Sidebar } from '../ui/Sidebar';
import { BroadcastStatusBanner } from '../ui/BroadcastStatusBanner';
import { NotificationBell } from '../ui/NotificationBell';
import { MobileNavBar } from '../ui/MobileNavBar';
import { AndroidBottomNav } from '../ui/AndroidBottomNav';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/hooks/usePlatform';
import { registerPushNotifications } from '@/services/pushService';

const roleColorMap: Record<string, string> = {
  superadmin: 'bg-red-500/15 text-red-300 border border-red-500/20',
  UH:         'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  marketing:  'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
};

const roleLabel: Record<string, string> = {
  superadmin: 'Superadmin',
  UH: 'UH',
  marketing: 'MCE',
};

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isNative } = usePlatform();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    registerPushNotifications();
  }, []);

  useEffect(() => {
    const el = document.getElementById('marketing-scroll');
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  if (isNative) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: '#080e1a' }}>
        <div className="flex flex-1 flex-col overflow-hidden">
          <BroadcastStatusBanner />
          <main className="flex-1 overflow-auto p-4 pb-28">
            <motion.div
              className="mx-auto max-w-lg"
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
            >
              {children}
            </motion.div>
          </main>
        </div>
        <AndroidBottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-[#080e1a]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Mobile Topbar ──────────────────── */}
        <div
          className="relative z-30 flex items-center gap-3 px-4 py-3 lg:hidden transition-all duration-300"
          style={{
            background: scrolled ? 'rgba(8,14,26,0.92)' : 'rgba(8,14,26,0.80)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <motion.button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
            whileTap={{ scale: 0.9 }}
          >
            <Menu className="h-5 w-5" />
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-blue-500/20 blur-sm" />
              <img src="/logofif.png" alt="FIF" className="relative h-7 w-7 object-contain" />
            </div>
            <span className="font-poppins text-sm font-bold tracking-tight text-white">FIF</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleColorMap[user?.role ?? ''] ?? roleColorMap.marketing}`}
            >
              {roleLabel[user?.role ?? ''] ?? user?.role}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            <button
              onClick={logout}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <BroadcastStatusBanner />

        {/* ── Main Content ──────────────────── */}
        <main id="marketing-scroll" className="flex-1 overflow-auto p-4 pb-28 lg:p-8 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              className="mx-auto max-w-7xl"
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
