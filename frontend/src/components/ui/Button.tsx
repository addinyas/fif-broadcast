import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-fif-600 text-white hover:bg-fif-700 active:bg-fif-800 active:scale-[0.97] shadow-sm shadow-fif-200 hover:shadow-md hover:shadow-fif-200/50 dark:shadow-fif-900/30 dark:hover:shadow-fif-900/50',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 active:scale-[0.97] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600',
  ghost:
    'text-slate-600 hover:bg-slate-100 active:bg-slate-200 active:scale-[0.97] dark:text-slate-400 dark:hover:bg-slate-800 dark:active:bg-slate-700',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 active:scale-[0.97] shadow-sm shadow-red-200 hover:shadow-md hover:shadow-red-200/50 dark:shadow-red-900/30 dark:hover:shadow-red-900/50',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-fif-500/40 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);
