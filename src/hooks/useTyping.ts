'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';

export function useTyping(socket: Socket | null, userId: string) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit(SOCKET_EVENTS.TYPING_STOP, { userId });
  }, [socket, userId]);

  const notifyTyping = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit(SOCKET_EVENTS.TYPING_START, { userId });

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket, userId, stopTyping]);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  return { notifyTyping, stopTyping };
}
