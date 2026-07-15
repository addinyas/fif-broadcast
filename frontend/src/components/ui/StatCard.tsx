import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'emerald' | 'amber';
}

const colorConfig: Record<string, { dot: string; bg: string; icon: string }> = {
  blue: { dot: 'bg-fif-500', bg: 'bg-fif-50 dark:bg-fif-900/20', icon: 'text-fif-600 dark:text-fif-400' },
  green: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  yellow: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' },
  red: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400' },
  purple: { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
  emerald: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  amber: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' },
};

export function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
  const cfg = colorConfig[color] || colorConfig.blue;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50 dark:hover:shadow-slate-900/50">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="font-redhat text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-200">{value}</p>
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} ${cfg.icon} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 h-1 rounded-full ${cfg.dot} transition-all duration-500 ease-out group-hover:w-full`} style={{ width: '40%' }} />
    </div>
  );
}
