'use client';

import { motion } from 'framer-motion';

export function TypingIndicator({ names }: { names: string[] }) {
  if (!names.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="px-4 pb-2 text-xs text-text-muted"
    >
      <span className="mr-2 font-medium text-text-secondary">{names.join(', ')}</span>
      <span className="inline-flex gap-1 align-middle">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
          />
        ))}
      </span>
    </motion.div>
  );
}
