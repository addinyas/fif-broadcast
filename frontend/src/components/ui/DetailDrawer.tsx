'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: 'amber' | 'blue' | 'emerald' | 'red' | 'slate' | 'violet';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const ACCENT: Record<NonNullable<DetailDrawerProps['accent']>, string> = {
  amber: 'from-amber-500/20 via-amber-500/5 to-transparent',
  blue: 'from-blue-500/20 via-blue-500/5 to-transparent',
  emerald: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  red: 'from-red-500/20 via-red-500/5 to-transparent',
  slate: 'from-slate-500/20 via-slate-500/5 to-transparent',
  violet: 'from-violet-500/20 via-violet-500/5 to-transparent',
};

export function DetailDrawer({ open, onClose, title, subtitle, accent = 'slate', icon, children }: DetailDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <div className={`relative flex items-start gap-3 px-4 pb-4 pt-5 sm:px-5 sm:pt-6 bg-gradient-to-b ${ACCENT[accent]}`}>
              {icon && (
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800/80">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{title}</h3>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 sm:block dark:hover:bg-white/10 dark:hover:text-slate-200"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-5 sm:pb-4">
              {children}
              <motion.button
                onClick={onClose}
                className="fixed bottom-5 right-5 z-10 flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full text-white shadow-xl ring-1 ring-white/20 sm:hidden"
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'linear-gradient(135deg, #0f172a, #1e3a8a)',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                }}
                aria-label="Kembali ke dashboard"
              >
                <ArrowLeft className="h-6 w-6" />
                <span className="text-[9px] font-semibold leading-none">Kembali</span>
              </motion.button>
            </div>
            <div className="hidden border-t border-slate-100 px-4 py-3 sm:block sm:px-5 dark:border-slate-800">
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Dashboard
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
