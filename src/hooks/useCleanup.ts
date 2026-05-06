'use client';

import { useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { keyStore } from '@/lib/crypto/keyStore';

export function useCleanup(socket: Socket | null, router: { push: (href: string) => void }) {
  const wipeAndExit = useCallback(() => {
    keyStore.wipe();

    if (socket?.connected) {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM);
      socket.disconnect();
    }

    router.push('/');
  }, [socket, router]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      keyStore.wipe();
      socket?.emit(SOCKET_EVENTS.LEAVE_ROOM);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [socket]);

  return { wipeAndExit };
}
