'use client';

import { motion } from 'framer-motion';

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 1, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="text-4xl">🛡️</div>
      <div className="mt-4 text-lg font-semibold text-text-primary">Nothing here yet</div>
      <div className="mt-2 max-w-md text-sm text-text-secondary">
        Messages never persist on the server. Say hello — your ciphertext is opaque to relays.
      </div>
    </motion.div>
  );
}
