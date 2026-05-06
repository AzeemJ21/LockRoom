'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Lock } from 'lucide-react';
import type { Message } from '@/lib/types/message.types';
import { cn } from '@/lib/utils/cn';

export function MessageBubble({
  message,
  self,
}: {
  message: Message;
  self: boolean;
}) {
  const text = message.decryptedContent ?? (message.type === 'system' ? '…' : '🔒 Unable to decrypt');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn('flex w-full', self ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'group relative max-w-[min(720px,92%)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg',
          self
            ? 'bg-gradient-to-br from-accent-primary to-accent-secondary text-white'
            : 'border border-white/10 bg-background-surface/70 text-text-primary backdrop-blur'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn('mb-1 text-[11px] font-medium', self ? 'text-white/80' : 'text-text-muted')}>
              {message.senderName}
            </div>
            <div className="whitespace-pre-wrap break-words">{text}</div>
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] opacity-70">
            <Lock className="h-3 w-3" />
          </span>
        </div>

        <div className="pointer-events-none mt-2 flex items-center justify-between gap-3 text-[10px] opacity-0 transition-opacity group-hover:opacity-70">
          <span className={self ? 'text-white/70' : 'text-text-muted'}>
            {format(message.timestamp, 'HH:mm:ss')}
          </span>
          <span className={self ? 'text-white/70' : 'text-text-muted'}>
            {self ? '✓✓' : '✓'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
