import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}          className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 ${
            error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-700' : 'border-slate-300 dark:border-slate-600'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-fif-500 focus:ring-2 focus:ring-fif-500/20 dark:bg-slate-800 dark:text-slate-200 ${
          error ? 'border-red-300 dark:border-red-700' : 'border-slate-300 dark:border-slate-600'
        } ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
