import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from '../ui/Sidebar';
import { BroadcastStatusBanner } from '../ui/BroadcastStatusBanner';
import { MobileNavBar } from '../ui/MobileNavBar';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fif-500 to-fif-700 text-sm font-bold text-white shadow">
            F
          </div>
          <span className="text-base font-bold text-slate-800 dark:text-slate-200">FIF</span>
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
