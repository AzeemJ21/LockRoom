'use client';

import { cn } from '@/lib/utils/cn';

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-text-secondary',
        className
      )}
    >
      {children}
    </span>
  );
}
