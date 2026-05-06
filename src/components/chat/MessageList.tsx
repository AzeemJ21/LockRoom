'use client';

import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message } from '@/lib/types/message.types';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { EmptyState } from '@/components/chat/EmptyState';

export function MessageList({ messages, userId }: { messages: Message[]; userId: string }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 12,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
  }, [messages.length, virtualizer]);

  if (!messages.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <EmptyState />
      </div>
    );
  }

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div
        className="relative mx-auto max-w-4xl"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((vi) => {
          const m = messages[vi.index];
          if (!m) return null;
          const self = m.senderId === userId;
          return (
            <div
              key={m.id}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              className="absolute left-0 right-0 pb-3"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <MessageBubble message={m} self={self} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
