'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings2,
  History,
  Smartphone,
  LogOut,
  Sun,
  Moon,
  SendHorizontal,
  Calculator,
  Settings,
  FileText,
  Store,
  ArrowLeftRight,
  X,
  Activity,
  ChevronRight,
  Map,
  MessageSquare,
  BarChart3,
  Bot,
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useBroadcastProgress } from '@/hooks/useBroadcastProgress';
import { useToast } from './Toast';
import { NotificationBell } from './NotificationBell';
import type { ReactNode } from 'react';

interface LinkItem {
  to: string;
  label: string;
  icon: ReactNode;
  feature?: string;
  badge?: string;
  section?: string;
}

const adminLinks: LinkItem[] = [
  { to: '/admin/dashboard',        label: 'Dashboard',        icon: <LayoutDashboard className="h-4.5 w-4.5" />, feature: 'dashboard',        section: 'main' },
  { to: '/admin/broadcast',        label: 'Broadcast',        icon: <SendHorizontal className="h-4.5 w-4.5" />,  feature: 'prospect_list',    section: 'main' },
  { to: '/admin/broadcast-terjadwal', label: 'Broadcast Terjadwal', icon: <CalendarClock className="h-4.5 w-4.5" />, section: 'main' },
  { to: '/admin/customers',        label: 'Customers',        icon: <Users className="h-4.5 w-4.5" />,           feature: 'customer_management', section: 'main' },
  { to: '/admin/calculator',       label: 'Kalkulator',       icon: <Calculator className="h-4.5 w-4.5" />,                                   section: 'tools' },
  { to: '/admin/rolling',          label: 'Rolling Data',     icon: <ArrowLeftRight className="h-4.5 w-4.5" />,  feature: 'data_rolling',     section: 'tools' },
  { to: '/admin/history',          label: 'History',          icon: <History className="h-4.5 w-4.5" />,         feature: 'broadcast_history', section: 'tools' },
  { to: '/admin/inbox',            label: 'Inbox',            icon: <MessageSquare className="h-4.5 w-4.5" />,   feature: 'broadcast',        section: 'tools' },
  { to: '/admin/worker-monitor',   label: 'Worker Monitor',   icon: <Activity className="h-4.5 w-4.5" />,        feature: 'broadcast',        section: 'tools' },
  { to: '/admin/users',            label: 'Users',            icon: <Shield className="h-4.5 w-4.5" />,          feature: 'user_management',  section: 'admin' },
  { to: '/admin/settings',         label: 'Settings',         icon: <Settings className="h-4.5 w-4.5" />,                                     section: 'admin' },
  { to: '/admin/kios-wilayah',     label: 'Wilayah Cabang',   icon: <Map className="h-4.5 w-4.5" />,                                            section: 'admin' },
  { to: '/admin/pengaturan',       label: 'Pengaturan',       icon: <Settings2 className="h-4.5 w-4.5" />,                                    section: 'admin' },
];

const superadminOnlyLinks: LinkItem[] = [
  { to: '/admin/wa-monitor',        label: 'WA Monitor',          icon: <Smartphone className="h-4.5 w-4.5" />, section: 'admin' },
  { to: '/admin/audit',             label: 'Audit Log',            icon: <FileText className="h-4.5 w-4.5" />,     section: 'admin' },
  { to: '/admin/reports',           label: 'Laporan Prospect',     icon: <BarChart3 className="h-4.5 w-4.5" />,    section: 'admin' },
  { to: '/admin/panduan-ai',        label: 'Panduan AI',           icon: <Bot className="h-4.5 w-4.5" />,           section: 'admin' },
  { to: '/admin/broadcast-settings', label: 'Broadcast Settings', icon: <Settings2 className="h-4.5 w-4.5" />,  section: 'admin' },
  { to: '/admin/permissions',       label: 'Permissions',         icon: <Settings2 className="h-4.5 w-4.5" />,  section: 'admin' },
  { to: '/admin/templates',         label: 'Templates',           icon: <FileText className="h-4.5 w-4.5" />,   section: 'admin' },
  { to: '/admin/kios',              label: 'Kios',                icon: <Store className="h-4.5 w-4.5" />,       section: 'admin' },
];

const marketingLinks: LinkItem[] = [
  { to: '/marketing/dashboard',      label: 'Dashboard',       icon: <LayoutDashboard className="h-4.5 w-4.5" />, feature: 'dashboard',          section: 'main' },
  { to: '/marketing/broadcast',      label: 'Broadcast',       icon: <SendHorizontal className="h-4.5 w-4.5" />,  feature: 'prospect_list',      section: 'main' },
  { to: '/marketing/broadcast-terjadwal', label: 'Broadcast Terjadwal', icon: <CalendarClock className="h-4.5 w-4.5" />, section: 'main' },
  { to: '/marketing/customers',      label: 'Customer',        icon: <Users className="h-4.5 w-4.5" />,           feature: 'customer_management', section: 'main' },
  { to: '/marketing/calculator',     label: 'Kalkulator',      icon: <Calculator className="h-4.5 w-4.5" />,                                     section: 'tools' },
  { to: '/marketing/history',        label: 'History',         icon: <History className="h-4.5 w-4.5" />,         feature: 'broadcast_history',  section: 'tools' },
  { to: '/marketing/inbox',          label: 'Inbox',           icon: <MessageSquare className="h-4.5 w-4.5" />,   feature: 'broadcast',          section: 'tools' },
  { to: '/marketing/panduan-ai',     label: 'Panduan AI',      icon: <Bot className="h-4.5 w-4.5" />,                section: 'tools' },
  { to: '/marketing/worker-monitor', label: 'Worker Monitor',  icon: <Activity className="h-4.5 w-4.5" />,        feature: 'broadcast',          section: 'tools' },
  { to: '/marketing/settings',       label: 'Settings',        icon: <Settings className="h-4.5 w-4.5" />,                                       section: 'admin' },
  { to: '/marketing/pengaturan',     label: 'Pengaturan',       icon: <Settings2 className="h-4.5 w-4.5" />,                                    section: 'admin' },
];

const sectionLabels: Record<string, string> = {
  main: 'Menu Utama',
  tools: 'Alat & Laporan',
  admin: 'Administrasi',
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleColorMap: Record<string, { pill: string; glow: string }> = {
  superadmin: { pill: 'bg-red-500/15 text-red-300 border border-red-500/20',      glow: 'shadow-red-500/20' },
  UH:         { pill: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',   glow: 'shadow-blue-500/20' },
  AO:         { pill: 'bg-amber-500/15 text-amber-300 border border-amber-500/20', glow: 'shadow-amber-500/20' },
  marketing:  { pill: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20', glow: 'shadow-emerald-500/20' },
};
const roleLabel: Record<string, string> = { superadmin: 'Superadmin', UH: 'UH', AO: 'AO', marketing: 'MCE' };

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { hasFeature } = usePermissions();
  const { progress, cancelling, cancel } = useBroadcastProgress();
  const { toast } = useToast();
  const extraLinks = user?.role === 'superadmin' ? superadminOnlyLinks : [];
  const allLinks = isAdmin ? [...adminLinks, ...extraLinks] : marketingLinks;

  const visibleLinks = allLinks.filter((link) => {
    if (!link.feature) return true;
    if (user?.role === 'superadmin') return true;
    return hasFeature(link.feature);
  });

  // Group by section
  const sections = ['main', 'tools', 'admin'].map((sec) => ({
    key: sec,
    label: sectionLabels[sec],
    links: visibleLinks.filter((l) => l.section === sec),
  })).filter((s) => s.links.length > 0);

  const roleCfg = roleColorMap[user?.role || ''] ?? roleColorMap.marketing;
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-[100] flex w-64 flex-col
          lg:static lg:translate-x-0
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'linear-gradient(180deg, #0b1220 0%, #0d1526 60%, #0b1220 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Ambient glow top */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-48 -translate-x-1/2 rounded-full bg-blue-500/10 blur-2xl" />

        {/* ── Header ─────────────────────────────── */}
        <div className="relative flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-blue-500/20 blur-sm animate-pulse-soft" />
            <img src="/logofif.png" alt="FIF" className="relative h-9 w-9 object-contain drop-shadow-lg" />
          </div>
          <div>
            <span className="font-poppins text-base font-bold tracking-tight text-white">FIF</span>
            <p className="text-[10px] text-slate-500">Broadcast System</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden lg:block"><NotificationBell variant="dark" placement="left" /></span>
            {/* Mobile close */}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/8 hover:text-slate-300 transition-colors lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Navigation ─────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 min-h-0">
          {sections.map((section, si) => (
            <div key={section.key}>
              <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.links.map((link, li) => {
                  const isActive = pathname === link.to || pathname.startsWith(link.to + '/');
                  return (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.05 + li * 0.03, duration: 0.35 }}
                    >
                      <Link
                        href={link.to}
                        onClick={() => window.innerWidth < 1024 && onClose()}
                        className={`
                          group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                          transition-all duration-200
                          ${isActive
                            ? 'bg-blue-600/20 text-white'
                            : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                          }
                        `}
                      >
                        {/* Active left indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-400"
                            style={{ boxShadow: '0 0 8px rgba(96,165,250,0.8)' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}

                        {/* Icon */}
                        <span className={`shrink-0 transition-all duration-200
                          ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                        >
                          {link.icon}
                        </span>

                        <span className="flex-1 font-poppins text-[13px]">{link.label}</span>

                        {/* Chevron */}
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 transition-all duration-200
                            ${isActive ? 'text-blue-400 opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'}`}
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Broadcast Progress Card ─────────────── */}
        <AnimatePresence>
          {progress && progress.is_active && (
            <motion.div
              className="mx-3 mb-3 rounded-xl overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.18)',
              }}
            >
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Broadcast Aktif
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('Batalkan SEMUA pesan yang masih pending?')) return;
                      const result = await cancel();
                      toast('success', result?.cancelled ? `${result.cancelled} pesan dibatalkan` : 'Tidak ada pesan');
                    }}
                    disabled={cancelling}
                    className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                  >
                    <X className="h-2.5 w-2.5" />
                    {cancelling ? '...' : 'Batal'}
                  </button>
                </div>
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-700/80">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(progress.total + progress.broadcast_manual) > 0
                        ? ((progress.sent + progress.failed + progress.broadcast_manual) / (progress.total + progress.broadcast_manual)) * 100
                        : 0}%`
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{progress.pending + progress.processing} antrian</span>
                  <span className="text-amber-500/80">{progress.sent} terkirim</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ─────────────────────────────── */}
        <div className="border-t border-white/[0.06] p-4 pb-24 lg:pb-4 space-y-2">
          {/* User profile */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div
              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white ring-2 ring-blue-500/20"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                : initials}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d1526]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-200">{user?.name}</div>
              <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${roleCfg.pill}`}>
                {roleLabel[user?.role || ''] ?? user?.role}
              </span>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 transition-all hover:bg-white/[0.05] hover:text-slate-200"
          >
            <motion.span
              key={isDark ? 'sun' : 'moon'}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
