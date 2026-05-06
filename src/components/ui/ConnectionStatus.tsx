'use client';

import { motion } from 'framer-motion';
import type { ConnectionStatus as CS } from '@/hooks/useSocket';
import { cn } from '@/lib/utils/cn';

export function ConnectionStatus({ status }: { status: CS }) {
  const label =
    status === 'connected'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'error'
          ? 'Error'
          : 'Offline';

  const color =
    status === 'connected'
      ? 'bg-status-online'
      : status === 'connecting'
        ? 'bg-status-away'
        : 'bg-status-offline';

  return (
    <motion.div
      layout
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-text-secondary"
    >
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span>{label}</span>
    </motion.div>
  );
}
