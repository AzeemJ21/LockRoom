'use client';

import { useMemo } from 'react';
import type { Participant } from '@/lib/types/room.types';

export function usePresence(participants: Participant[]) {
  return useMemo(() => {
    const online = participants.filter((p) => p.isOnline);
    return {
      onlineCount: online.length,
      offlineCount: participants.length - online.length,
    };
  }, [participants]);
}
