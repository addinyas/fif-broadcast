import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'live';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  pulse?: boolean;
  dot?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<BadgeVariant, { pill: string; dot: string }> = {
  default:  { pill: 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700', dot: 'bg-slate-400' },
  success:  { pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40', dot: 'bg-emerald-500' },
  warning:  { pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40', dot: 'bg-amber-500' },
  danger:   { pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200/60 dark:border-red-700/40', dot: 'bg-red-500' },
  info:     { pill: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40', dot: 'bg-blue-500' },
  purple:   { pill: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200/60 dark:border-violet-700/40', dot: 'bg-violet-500' },
  live:     { pill: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200/60 dark:border-rose-700/40', dot: 'bg-rose-500' },
};

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-[10px] font-semibold',
  sm: 'px-2 py-0.5 text-[11px] font-semibold',
  md: 'px-2.5 py-1 text-xs font-semibold',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  pulse = false,
  dot = false,
  onClick,
}: BadgeProps) {
  const cfg = variantStyles[variant] ?? variantStyles.default;

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full tracking-wide ${cfg.pill} ${sizeStyles[size]} ${
        onClick ? 'cursor-pointer transition-transform hover:scale-105' : ''
      }`}
    >
      {(dot || pulse) && (
        <span className="relative flex shrink-0 items-center justify-center" style={{ width: 6, height: 6 }}>
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping-slow ${cfg.dot}`}
            />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
}
