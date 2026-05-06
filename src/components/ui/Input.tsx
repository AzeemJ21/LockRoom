'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-white/10 bg-background-secondary/60 px-4 py-3 font-mono text-sm text-text-primary outline-none ring-0 transition placeholder:text-text-muted focus:border-accent-primary/60 focus:ring-2 focus:ring-accent-primary/25',
          className
        )}
        {...props}
      />
    );
  }
);
