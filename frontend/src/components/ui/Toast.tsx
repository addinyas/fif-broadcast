import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
  error: <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />,
  warning: <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
  info: <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
};

const bgStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
  error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 8000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 z-[100] flex flex-col gap-2 sm:left-auto sm:max-w-sm">
        {items.map((item) => (
          <div
            key={item.id}
            className={`animate-toast-in flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg dark:shadow-slate-900/50 ${bgStyles[item.type]}`}
          >
            <span className="shrink-0">{icons[item.type]}</span>
            <p className="min-w-0 flex-1 break-words text-sm font-medium text-slate-800 dark:text-slate-200">{item.message}</p>
            <button
              onClick={() => remove(item.id)}
              className="ml-2 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 dark:text-slate-500 dark:hover:bg-slate-700/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
