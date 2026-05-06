'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils/cn';

export function Avatar({
  fallback,
  className,
  status,
}: {
  fallback: string;
  className?: string;
  status?: 'online' | 'away' | 'offline';
}) {
  const ring =
    status === 'online'
      ? 'ring-2 ring-emerald-400/80'
      : status === 'away'
        ? 'ring-2 ring-amber-400/80'
        : 'ring-0';

  return (
    <div className={cn('relative inline-flex', className)}>
      <AvatarPrimitive.Root
        className={cn(
          'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-background-tertiary text-xs font-semibold text-text-primary',
          ring
        )}
      >
        <AvatarPrimitive.Fallback delayMs={40}>{fallback.slice(0, 2).toUpperCase()}</AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
    </div>
  );
}
