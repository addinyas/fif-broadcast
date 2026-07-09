import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px] font-semibold',
  md: 'px-2.5 py-1 text-xs font-semibold',
};

export function Badge({ children, variant = 'default', size = 'sm', pulse = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide ${variantStyles[variant]} ${sizeStyles[size]} ${pulse ? 'animate-pulse-soft' : ''}`}
    >
      {pulse && <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${variant === 'danger' ? 'bg-red-500 animate-pulse' : variant === 'warning' ? 'bg-amber-500 animate-pulse' : 'bg-current'}`} />}
      {children}
    </span>
  );
}
