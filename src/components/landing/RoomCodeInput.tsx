'use client';

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';

export const RoomCodeInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    value: string;
    onValueChange: (next: string) => void;
  }
>(function RoomCodeInput({ value, onValueChange, className, ...props }, ref) {
  return (
    <motion.div layout className={cn('w-full', className)}>
      <Input
        ref={ref}
        value={value}
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder="ABC123XY"
        maxLength={10}
        onChange={(e) => {
          const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          onValueChange(raw.slice(0, 10));
        }}
        {...props}
      />
      <div className="mt-2 flex justify-between text-xs text-text-muted">
        <span>6–10 characters</span>
        <span>{value.length}/10</span>
      </div>
    </motion.div>
  );
});
