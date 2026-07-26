'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'emerald' | 'amber' | 'cyan';
  index?: number;
  trend?: number;      // positive/negative % for trend display
  subtitle?: string;
  onClick?: () => void;
  clickable?: boolean;
}

/* ── Color configurations ─────────────────────────────── */
const colorConfig: Record<string, {
  border: string;
  iconText: string;
  iconBg: string;
  glowClass: string;
  gradientFrom: string;
  gradientTo: string;
  trendColor: string;
  badgeBg: string;
}> = {
  blue: {
    border: 'rgba(59,130,246,0.6)',
    iconText: 'text-blue-500 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    glowClass: 'glow-blue',
    gradientFrom: 'from-blue-500/8',
    gradientTo: 'to-indigo-500/5',
    trendColor: 'text-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  green: {
    border: 'rgba(16,185,129,0.6)',
    iconText: 'text-emerald-500 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    glowClass: 'glow-emerald',
    gradientFrom: 'from-emerald-500/8',
    gradientTo: 'to-cyan-500/5',
    trendColor: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  emerald: {
    border: 'rgba(16,185,129,0.6)',
    iconText: 'text-emerald-500 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    glowClass: 'glow-emerald',
    gradientFrom: 'from-emerald-500/8',
    gradientTo: 'to-cyan-500/5',
    trendColor: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  yellow: {
    border: 'rgba(245,158,11,0.6)',
    iconText: 'text-amber-500 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    glowClass: 'glow-amber',
    gradientFrom: 'from-amber-500/8',
    gradientTo: 'to-orange-500/5',
    trendColor: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  amber: {
    border: 'rgba(245,158,11,0.6)',
    iconText: 'text-amber-500 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    glowClass: 'glow-amber',
    gradientFrom: 'from-amber-500/8',
    gradientTo: 'to-orange-500/5',
    trendColor: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  red: {
    border: 'rgba(239,68,68,0.6)',
    iconText: 'text-red-500 dark:text-red-400',
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    glowClass: 'glow-red',
    gradientFrom: 'from-red-500/8',
    gradientTo: 'to-rose-500/5',
    trendColor: 'text-red-500',
    badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  purple: {
    border: 'rgba(139,92,246,0.6)',
    iconText: 'text-violet-500 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    glowClass: 'glow-violet',
    gradientFrom: 'from-violet-500/8',
    gradientTo: 'to-purple-500/5',
    trendColor: 'text-violet-500',
    badgeBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  cyan: {
    border: 'rgba(6,182,212,0.6)',
    iconText: 'text-cyan-500 dark:text-cyan-400',
    iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
    glowClass: 'glow-blue',
    gradientFrom: 'from-cyan-500/8',
    gradientTo: 'to-blue-500/5',
    trendColor: 'text-cyan-500',
    badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
};

/* ── Count-up hook ────────────────────────────────────── */
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === 0 || started.current) return;
    const timer = setTimeout(() => {
      started.current = true;
      const step = (ts: number) => {
        if (!startTime.current) startTime.current = ts;
        const elapsed = ts - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out-expo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCount(Math.round(eased * target));
        if (progress < 1) {
          raf.current = requestAnimationFrame(step);
        }
      };
      raf.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, delay]);

  return count;
}

/* ── Ripple hook ──────────────────────────────────────── */
function useRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const addRipple = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 650);
  };

  return { ripples, addRipple };
}

/* ── Card variants ────────────────────────────────────── */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.07,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
  hover: {
    y: -5,
    transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
  },
  tap: { scale: 0.97 },
};

/* ── StatCard ─────────────────────────────────────────── */
export function StatCard({
  title,
  value,
  icon,
  color = 'blue',
  index = 0,
  trend,
  subtitle,
  onClick,
  clickable = false,
}: StatCardProps) {
  const cfg = colorConfig[color] ?? colorConfig.blue;
  const numericValue = typeof value === 'number' ? value : (parseInt(String(value)) || 0);
  const isNumeric = typeof value === 'number' || !isNaN(Number(value));
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 1000, index * 80);
  const { ripples, addRipple } = useRipple();
  const isClickable = clickable || !!onClick;

  const displayValue = isNumeric ? animatedValue : value;

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-800/80
        ${isClickable ? 'cursor-pointer select-none' : ''}
        transition-shadow duration-300
      `}
      style={{
        borderColor: cfg.border,
        borderWidth: '1px',
        borderLeftWidth: '3px',
      }}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={isClickable ? "hover" : { y: -3 }}
      whileTap={isClickable ? "tap" : undefined}
      custom={index}
      onClick={(e) => {
        if (isClickable) {
          addRipple(e as unknown as React.MouseEvent<HTMLElement>);
          onClick?.();
        }
      }}
    >
      {/* Gradient background overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} opacity-60 transition-opacity duration-300 group-hover:opacity-100`} />

      {/* Shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>

      {/* Ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/20 animate-ripple"
          style={{ left: r.x - 10, top: r.y - 10, width: 20, height: 20 }}
        />
      ))}

      {/* Content */}
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
              {title}
            </p>
            <motion.p
              className="font-satoshi text-3xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100"
              key={value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {displayValue}
            </motion.p>
            {subtitle && (
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>
            )}
          </div>

          {/* Icon */}
          {icon && (
            <motion.div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg} ${cfg.iconText} transition-all duration-300`}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {icon}
            </motion.div>
          )}
        </div>

        {/* Trend indicator */}
        {trend !== undefined && (
          <div className={`mt-3 flex items-center gap-1 text-[11px] font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {trend >= 0 ? '+' : ''}{trend}% dari kemarin
          </div>
        )}

        {/* Click hint */}
        {isClickable && (
          <div className={`mt-2 text-[10px] font-medium ${cfg.trendColor} opacity-0 group-hover:opacity-60 transition-opacity`}>
            Klik untuk detail →
          </div>
        )}
      </div>
    </motion.div>
  );
}
