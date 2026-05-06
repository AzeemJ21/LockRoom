'use client';

import * as ScrollArea from '@radix-ui/react-scroll-area';
import type { Participant } from '@/lib/types/room.types';
import { Avatar } from '@/components/ui/Avatar';

export function ParticipantList({ participants, selfId }: { participants: Participant[]; selfId: string }) {
  return (
    <div>
      <div className="mb-2 text-xs font-mono uppercase tracking-[0.22em] text-text-muted">Online</div>
      <ScrollArea.Root className="h-[220px] rounded-xl border border-white/10 bg-background-secondary/40">
        <ScrollArea.Viewport className="h-full p-2">
          <div className="space-y-2">
            {participants.map((p) => (
              <div key={`${p.socketId}-${p.userId}`} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <Avatar fallback={p.displayName} status={p.isOnline ? 'online' : 'offline'} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text-primary">
                    {p.displayName}
                    {p.userId === selfId ? <span className="ml-2 text-xs text-text-muted">(you)</span> : null}
                  </div>
                  <div className="truncate font-mono text-[11px] text-text-muted">{p.userId.slice(0, 10)}…</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none p-0.5">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/15" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
