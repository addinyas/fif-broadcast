'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  SendHorizontal,
  Calculator,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';

interface TabItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const tabs: TabItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/broadcast', label: 'Broadcast', icon: <SendHorizontal className="h-5 w-5" /> },
  { to: '/customers', label: 'Customer', icon: <Users className="h-5 w-5" /> },
  { to: '/calculator', label: 'Kalkulator', icon: <Calculator className="h-5 w-5" /> },
];

export function MobileNavBar() {
  const { isAdmin } = useAuth();
  const pathname = usePathname();
  const prefix = isAdmin ? '/admin' : '/marketing';

  const resolvedTabs = tabs.map((tab) => ({
    ...tab,
    to: `${prefix}${tab.to}`,
  }));

  return (
    <nav
      className="font-poppins fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe pt-2 lg:hidden transition-all duration-300"
      style={{
        background: 'rgba(8, 14, 26, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      {resolvedTabs.map((tab) => {
        const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/');
        return (
          <Link
            key={tab.to}
            href={tab.to}
            className={`relative flex flex-1 flex-col items-center gap-1 py-1.5 text-xs font-medium transition-all duration-200 ${
              isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="mobile-nav-active"
                className="absolute -top-2 h-1 w-8 rounded-full bg-blue-400"
                style={{ boxShadow: '0 0 10px rgba(96, 165, 250, 0.8)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <motion.span
              animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="shrink-0"
            >
              {tab.icon}
            </motion.span>
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
