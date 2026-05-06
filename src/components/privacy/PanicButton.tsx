'use client';

import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onPanic: () => void;
}

export function PanicButton({ onPanic }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startHold = useCallback(() => {
    setIsHolding(true);
    let p = 0;
    clearTimer();
    timerRef.current = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearTimer();
        setIsHolding(false);
        setProgress(0);
        onPanic();
      }
    }, 100);
  }, [clearTimer, onPanic]);

  const stopHold = useCallback(() => {
    clearTimer();
    setIsHolding(false);
    setProgress(0);
  }, [clearTimer]);

  return (
    <motion.button
      type="button"
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      className="relative overflow-hidden px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/30 text-red-400 text-xs font-mono"
      title="Hold 2s to instantly exit and wipe"
    >
      <span className="relative z-10">⚠ PANIC</span>
      {isHolding && (
        <motion.div
          className="absolute inset-0 bg-red-600/40 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
        />
      )}
    </motion.button>
  );
}
