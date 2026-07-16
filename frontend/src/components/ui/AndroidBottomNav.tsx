import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  SendHorizontal,
  Calculator,
  History,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
  { to: '/history', label: 'History', icon: <History className="h-5 w-5" /> },
  { to: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export function AndroidBottomNav() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const prefix = isAdmin ? '/admin' : '/marketing';

  const resolvedTabs = tabs.map((tab) => ({
    ...tab,
    to: `${prefix}${tab.to}`,
  }));

  return (
    <nav className="font-poppins fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white px-1 pb-safe pt-1 dark:border-slate-700 dark:bg-slate-800">
      {resolvedTabs.map((tab) => {
        const isActive = location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors ${
              isActive
                ? 'text-fif-600 dark:text-fif-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <span className={`transition-colors ${isActive ? 'text-fif-600 dark:text-fif-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
