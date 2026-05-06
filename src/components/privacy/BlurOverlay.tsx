'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function BlurOverlay() {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const onBlur = () => setIsBlurred(true);
    const onFocus = () => setIsBlurred(false);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <AnimatePresence>
      {isBlurred && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsBlurred(false)}
          className="absolute inset-0 z-50 backdrop-blur-xl bg-background-primary/80 flex items-center justify-center text-left"
        >
          <div className="text-center space-y-2">
            <div className="text-4xl">🔒</div>
            <p className="text-text-secondary text-sm">Chat blurred for privacy</p>
            <p className="text-text-muted text-xs">Click to resume</p>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
