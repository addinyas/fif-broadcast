import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings2,
  History,
  Smartphone,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  SendHorizontal,
  Calculator,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { ReactNode } from 'react';

interface LinkItem {
  to: string;
  label: string;
  icon: ReactNode;
  feature?: string;
}

const adminLinks: LinkItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, feature: 'dashboard' },
  { to: '/admin/broadcast', label: 'Broadcast', icon: <SendHorizontal className="h-5 w-5" />, feature: 'prospect_list' },
  { to: '/admin/customers', label: 'Customers', icon: <Users className="h-5 w-5" />, feature: 'customer_management' },
  { to: '/admin/connect', label: 'Connect', icon: <Smartphone className="h-5 w-5" />, feature: 'qr_scanner' },
  { to: '/admin/history', label: 'History', icon: <History className="h-5 w-5" />, feature: 'broadcast_history' },
  { to: '/admin/users', label: 'Users', icon: <Shield className="h-5 w-5" /> },
  { to: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  { to: '/admin/calculator', label: 'Kalkulator', icon: <Calculator className="h-5 w-5" /> },
];

const superadminOnlyLinks: LinkItem[] = [
  { to: '/admin/permissions', label: 'Permissions', icon: <Settings2 className="h-5 w-5" /> },
];

const marketingLinks: LinkItem[] = [
  { to: '/marketing/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, feature: 'dashboard' },
  { to: '/marketing/broadcast', label: 'Broadcast', icon: <SendHorizontal className="h-5 w-5" />, feature: 'prospect_list' },
  { to: '/marketing/customers', label: 'Customer', icon: <Users className="h-5 w-5" />, feature: 'customer_management' },
  { to: '/marketing/history', label: 'History', icon: <History className="h-5 w-5" />, feature: 'broadcast_history' },
  { to: '/marketing/connect', label: 'Connect', icon: <Smartphone className="h-5 w-5" />, feature: 'qr_scanner' },
  { to: '/marketing/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  { to: '/marketing/calculator', label: 'Kalkulator', icon: <Calculator className="h-5 w-5" /> },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { hasFeature } = usePermissions();
  const extraLinks = user?.role === 'superadmin' ? superadminOnlyLinks : [];

  const allLinks = isAdmin ? [...adminLinks, ...extraLinks] : marketingLinks;

  const visibleLinks = allLinks.filter((link) => {
    if (!link.feature) return true;
    if (user?.role === 'superadmin') return true;
    return hasFeature(link.feature);
  });

  const roleColorMap: Record<string, string> = {
    superadmin: 'bg-red-500/20 text-red-300',
    UH: 'bg-blue-500/20 text-blue-300',
    marketing: 'bg-emerald-500/20 text-emerald-300',
  };

  const roleLabel: Record<string, string> = {
    superadmin: 'superadmin',
    UH: 'UH',
    marketing: 'MCE',
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in" onClick={onClose} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
          <img src="/logo.png" alt="FIF" className="h-9 w-9 object-contain" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">FIF</span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleColorMap[user?.role || ''] || roleColorMap.marketing}`}>
              {roleLabel[user?.role || ''] || user?.role}
            </span>
          </div>
          <button onClick={logout} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 lg:hidden" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 min-h-0">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-fif-600/20 to-fif-600/5 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-colors ${isActive ? 'text-fif-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {link.icon}
                </span>
                <span className="flex-1">{link.label}</span>
                <ChevronRight className={`h-4 w-4 transition-all ${isActive ? 'translate-x-0 opacity-100 text-fif-400' : '-translate-x-1 opacity-0'}`} />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-3.5 rounded-xl bg-slate-800/50 p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fif-400 to-fif-600 text-sm font-bold text-white shadow-md ring-2 ring-slate-700">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-100">{user?.name}</div>
            <div className="truncate text-xs text-slate-400">{user?.email}</div>
            {(user?.kios_name || user?.kios_id) && (
              <div className="truncate text-[11px] font-medium text-slate-500">
                {[user?.kios_name, user?.kios_id].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800/50 hover:text-slate-200"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
      </aside>
    </>
  );
}
