'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', ...props },
  ref
) {
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-[0_10px_40px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_55px_rgba(99,102,241,0.45)]'
      : variant === 'danger'
        ? 'bg-red-950/40 border border-red-800/40 text-red-200 hover:bg-red-950/60'
        : 'bg-white/5 border border-white/10 text-text-primary hover:bg-white/10';

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="inline-flex">
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
          styles,
          className
        )}
        {...props}
      />
    </motion.div>
  );
});
