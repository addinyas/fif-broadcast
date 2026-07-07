import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  History,
  Smartphone,
  SendHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { ReactNode } from 'react';

interface TabItem {
  to: string;
  label: string;
  icon: ReactNode;
  feature?: string;
}

const adminTabs: TabItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, feature: 'dashboard' },
  { to: '/admin/broadcast', label: 'Broadcast', icon: <SendHorizontal className="h-5 w-5" />, feature: 'prospect_list' },
  { to: '/admin/customers', label: 'Customers', icon: <Users className="h-5 w-5" />, feature: 'customer_management' },
  { to: '/admin/templates', label: 'Templates', icon: <FileText className="h-5 w-5" />, feature: 'template_management' },
  { to: '/admin/connect', label: 'Connect', icon: <Smartphone className="h-5 w-5" />, feature: 'qr_scanner' },
];

const marketingTabs: TabItem[] = [
  { to: '/marketing/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, feature: 'dashboard' },
  { to: '/marketing/broadcast', label: 'Broadcast', icon: <SendHorizontal className="h-5 w-5" />, feature: 'prospect_list' },
  { to: '/marketing/customers', label: 'Customer', icon: <Users className="h-5 w-5" />, feature: 'customer_management' },
  { to: '/marketing/history', label: 'History', icon: <History className="h-5 w-5" />, feature: 'broadcast_history' },
  { to: '/marketing/connect', label: 'Connect', icon: <Smartphone className="h-5 w-5" />, feature: 'qr_scanner' },
];

export function MobileNavBar() {
  const { isAdmin, user } = useAuth();
  const { hasFeature } = usePermissions();
  const location = useLocation();

  const tabs = isAdmin ? adminTabs : marketingTabs;

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.feature) return true;
    if (user?.role === 'superadmin') return true;
    return hasFeature(tab.feature);
  });

  if (visibleTabs.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white px-2 pb-safe dark:border-slate-700 dark:bg-slate-800 lg:hidden">
      {visibleTabs.map((tab) => {
        const isActive = location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
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
