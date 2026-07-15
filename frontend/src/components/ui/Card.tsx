import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: boolean;
  hover?: boolean;
}

export function Card({ children, padding = true, hover = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 dark:border-slate-700/80 dark:bg-slate-800 dark:shadow-slate-900/50 ${hover ? 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50' : ''} ${padding ? 'p-5 sm:p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 flex items-center justify-between ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-subheading text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200 ${className}`}>{children}</h2>;
}
