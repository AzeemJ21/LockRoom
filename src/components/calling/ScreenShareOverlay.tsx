'use client';

import { motion } from 'framer-motion';

export function ScreenShareOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed left-4 top-4 z-[70] rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs text-text-primary backdrop-blur"
    >
      Screen sharing active
    </motion.div>
  );
}
