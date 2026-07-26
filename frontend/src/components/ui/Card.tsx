'use client';

import { motion } from 'framer-motion';
import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
  hover?: boolean;
  glass?: boolean;
  glow?: boolean;
  animate?: boolean;
  animDelay?: number;
}

export function Card({
  children,
  padding = true,
  hover = false,
  glass = false,
  glow = false,
  animate = true,
  animDelay = 0,
  className = '',
  ...props
}: CardProps) {
  const base = `
    relative overflow-hidden rounded-2xl
    border border-slate-200/80 dark:border-slate-700/60
    transition-all duration-300
    ${glass
      ? 'glass dark:glass-dark'
      : 'bg-white dark:bg-slate-800/90 shadow-sm dark:shadow-slate-900/60'}
    ${hover
      ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60 hover:border-slate-300/80 dark:hover:border-slate-600/60 cursor-pointer'
      : ''}
    ${glow ? 'glow-blue hover:glow-blue-lg' : ''}
    ${padding ? 'p-5 sm:p-6' : ''}
    ${className}
  `;

  if (animate) {
    return (
      <motion.div
        className={base}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: animDelay, ease: [0.22, 1, 0.36, 1] }}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {/* Subtle inner highlight at top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
        {children}
      </motion.div>
    );
  }

  return (
    <div className={base} {...props}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-subheading text-base font-semibold tracking-tight text-slate-800 dark:text-slate-200 ${className}`}
    >
      {children}
    </h2>
  );
}

export function CardDivider() {
  return (
    <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent dark:via-slate-700/80" />
  );
}
