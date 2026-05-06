'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn('h-5 w-5 rounded-full border-2 border-white/15 border-t-accent-primary', className)}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      role="status"
      aria-label="Loading"
    />
  );
}
