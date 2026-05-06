'use client';

import { motion } from 'framer-motion';

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="mesh-bg absolute inset-0" />
      {[...Array(18)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/25"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.25, 0.65, 0.25] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
