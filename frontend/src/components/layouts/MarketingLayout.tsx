import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from '../ui/Sidebar';
import { BroadcastStatusBanner } from '../ui/BroadcastStatusBanner';
import { MobileNavBar } from '../ui/MobileNavBar';
import { AndroidBottomNav } from '../ui/AndroidBottomNav';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../hooks/usePlatform';
import { registerPushNotifications } from '../../services/pushService';

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

export function MarketingLayout() {
  const { user } = useAuth();
  const { isNative } = usePlatform();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    registerPushNotifications();
  }, []);

  if (isNative) {
    return (
      <div className="flex h-screen overflow-hidden bg-surface dark:bg-slate-900">
        <div className="flex flex-1 flex-col overflow-hidden">
          <BroadcastStatusBanner />
          <main className="flex-1 overflow-auto p-4 pb-24">
            <div className="mx-auto max-w-lg animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
        <AndroidBottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-800/90 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-all hover:bg-slate-100 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src="/logo.png" alt="FIF" className="h-8 w-8 object-contain" />
          <span className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200">FIF</span>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleColorMap[user?.role || ''] || roleColorMap.marketing}`}>
            {roleLabel[user?.role || ''] || user?.role}
          </span>
        </div>
        <BroadcastStatusBanner />
        <main className="flex-1 overflow-auto p-4 pb-20 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNavBar />
    </div>
  );
}
