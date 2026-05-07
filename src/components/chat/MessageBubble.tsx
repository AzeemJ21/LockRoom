'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Lock, Reply } from 'lucide-react';
import type { Message } from '@/lib/types/message.types';
import { cn } from '@/lib/utils/cn';
import { MediaAttachment } from '@/components/chat/MediaAttachment';

export function MessageBubble({
  message,
  self,
  onReply,
}: {
  message: Message;
  self: boolean;
  onReply?: (m: Message) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  const text =
    message.decryptedContent ?? (message.type === 'system' ? '…' : '🔒 Unable to decrypt');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn('flex w-full', self ? 'justify-end' : 'justify-start')}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || !onReply) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const dx = endX - touchStartX.current;
        touchStartX.current = null;
        if (dx > 48) onReply(message);
      }}
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
          <div className="min-w-0 flex-1">
            <div className={cn('mb-1 flex items-center justify-between gap-2 text-[11px] font-medium', self ? 'text-white/80' : 'text-text-muted')}>
              <span>{message.senderName}</span>
              {onReply ? (
                <button
                  type="button"
                  className={cn(
                    'rounded p-1 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 md:opacity-0',
                    'focus:opacity-100'
                  )}
                  aria-label="Reply"
                  onClick={() => onReply(message)}
                >
                  <Reply className={cn('h-3.5 w-3.5', self ? 'text-white/90' : 'text-text-muted')} />
                </button>
              ) : null}
            </div>

            {message.replyTo ? (
              <div
                className={cn(
                  'mb-2 border-l-2 pl-2 text-[11px] opacity-90',
                  self ? 'border-white/50 text-white/85' : 'border-accent-primary/60 text-text-muted'
                )}
              >
                {message.replyTo.preview}
              </div>
            ) : null}

            {message.media ? (
              <div className="space-y-2">
                <MediaAttachment senderId={message.senderId} media={message.media} />
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{text}</div>
            )}
          </div>
          <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] opacity-70">
            <Lock className="h-3 w-3" />
          </span>
        </div>

        <div className="pointer-events-none mt-2 flex items-center justify-between gap-3 text-[10px] opacity-0 transition-opacity group-hover:opacity-70">
          <span className={self ? 'text-white/70' : 'text-text-muted'}>
            {format(message.timestamp, 'HH:mm:ss')}
          </span>
          <span className={self ? 'text-white/70' : 'text-text-muted'}>{self ? '✓✓' : '✓'}</span>
        </div>
      </div>
    </motion.div>
  );
}
