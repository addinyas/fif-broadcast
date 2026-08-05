'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Power, Clock, Loader2, CheckCircle2, XCircle, Ban } from 'lucide-react';
import type { ComponentType } from 'react';

type StatusKey = 'idle' | 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

interface StatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

interface StateConfig {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  pill: string;
  icon: string;
  spin?: boolean;
}

const CONFIG: Record<StatusKey, StateConfig> = {
  idle: {
    label: 'Idle',
    Icon: Power,
    pill: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700',
    icon: 'text-slate-500',
  },
  pending: {
    label: 'Menunggu',
    Icon: Clock,
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  processing: {
    label: 'Memproses',
    Icon: Loader2,
    pill: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40',
    icon: 'text-blue-600 dark:text-blue-400',
    spin: true,
  },
  sent: {
    label: 'Terkirim',
    Icon: CheckCircle2,
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    label: 'Gagal',
    Icon: XCircle,
    pill: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200/60 dark:border-red-700/40',
    icon: 'text-red-600 dark:text-red-400',
  },
  cancelled: {
    label: 'Dibatalkan',
    Icon: Ban,
    pill: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700',
    icon: 'text-slate-500',
  },
};

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-[10px] font-semibold',
  sm: 'px-2 py-0.5 text-[11px] font-semibold',
  md: 'px-2.5 py-1 text-xs font-semibold',
};

const iconSize = { xs: 'h-3 w-3', sm: 'h-3.5 w-3.5', md: 'h-4 w-4' };

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const key = (status in CONFIG ? status : 'idle') as StatusKey;
  const cfg = CONFIG[key];
  const { Icon } = cfg;

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 rounded-full tracking-wide ${cfg.pill} ${sizeStyles[size]} ${className ?? ''}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={key}
          className="inline-flex items-center gap-1.5"
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Icon className={`${iconSize[size]} ${cfg.icon} ${cfg.spin ? 'animate-spin' : ''}`} />
          <span>{cfg.label}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
