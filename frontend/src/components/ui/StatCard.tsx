import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'emerald' | 'amber';
}

const colorConfig: Record<string, { border: string; icon: string; iconBg: string }> = {
  blue:    { border: '#3b82f6', icon: 'text-fif-600 dark:text-fif-400',    iconBg: 'bg-fif-50 dark:bg-fif-900/30' },
  green:   { border: '#10b981', icon: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  yellow:  { border: '#f59e0b', icon: 'text-amber-600 dark:text-amber-400',  iconBg: 'bg-amber-50 dark:bg-amber-900/30' },
  red:     { border: '#ef4444', icon: 'text-red-600 dark:text-red-400',    iconBg: 'bg-red-50 dark:bg-red-900/30' },
  purple:  { border: '#8b5cf6', icon: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-50 dark:bg-purple-900/30' },
  emerald: { border: '#10b981', icon: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  amber:   { border: '#f59e0b', icon: 'text-amber-600 dark:text-amber-400',  iconBg: 'bg-amber-50 dark:bg-amber-900/30' },
};

export function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
  const cfg = colorConfig[color] || colorConfig.blue;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800"
      style={{ borderLeftWidth: '3px', borderLeftColor: cfg.border }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{title}</p>
          <p className="font-satoshi text-4xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.iconBg} ${cfg.icon} transition-all duration-300 group-hover:scale-110`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
