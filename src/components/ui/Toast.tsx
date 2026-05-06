'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Variant = 'info' | 'error';

interface ToastContextValue {
  push: (message: string, variant?: Variant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; variant: Variant } | null>(null);

  const push = useCallback((message: string, variant: Variant = 'info') => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 3800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={
              toast.variant === 'error'
                ? 'fixed bottom-6 right-6 z-[120] max-w-md rounded-xl border border-red-900/40 bg-red-950/70 px-4 py-3 text-sm text-red-100 shadow-2xl backdrop-blur'
                : 'fixed bottom-6 right-6 z-[120] max-w-md rounded-xl border border-white/10 bg-background-secondary/90 px-4 py-3 text-sm text-text-primary shadow-2xl backdrop-blur'
            }
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}
