import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'emerald' | 'amber';
}

const colorConfig: Record<string, { gradient: string; dot: string; bg: string; icon: string }> = {
  blue: { gradient: 'from-fif-500 to-blue-600', dot: 'bg-fif-500', bg: 'bg-fif-50 dark:bg-fif-900/20', icon: 'text-fif-600 dark:text-fif-400' },
  green: { gradient: 'from-emerald-500 to-green-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  yellow: { gradient: 'from-amber-500 to-yellow-600', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' },
  red: { gradient: 'from-red-500 to-rose-600', dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400' },
  purple: { gradient: 'from-purple-500 to-violet-600', dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
  emerald: { gradient: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  amber: { gradient: 'from-amber-500 to-orange-600', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' },
};

export function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
  const cfg = colorConfig[color] || colorConfig.blue;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">{value}</p>
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} ${cfg.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 h-1 rounded-full ${cfg.dot} transition-all duration-300 group-hover:w-full`} style={{ width: '40%' }} />
    </div>
  );
}
