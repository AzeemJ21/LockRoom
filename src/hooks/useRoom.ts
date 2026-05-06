'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Participant } from '@/lib/types/room.types';
import { displayNameFromUserId } from '@/lib/utils/displayName';

export function useRoom(socket: Socket | null, roomCode: string, userId: string, publicKey?: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  const upsertParticipant = useCallback((p: Participant) => {
    setParticipants((prev) => {
      const others = prev.filter((x) => x.socketId !== p.socketId);
      return [...others, p];
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const selfParticipant = (): Participant => ({
      userId,
      socketId: socket.id ?? '',
      displayName: displayNameFromUserId(userId),
      publicKey,
      isOnline: true,
      joinedAt: Date.now(),
    });

    const onJoined = (payload: {
      roomCode: string;
      participants: { userId: string; socketId: string; publicKey?: string }[];
    }) => {
      if (payload.roomCode !== roomCode) return;
      const mapped: Participant[] = payload.participants.map((x) => ({
        userId: x.userId,
        socketId: x.socketId,
        displayName: displayNameFromUserId(x.userId),
        publicKey: x.publicKey,
        isOnline: true,
        joinedAt: Date.now(),
      }));
      setParticipants([...mapped, selfParticipant()]);
    };

    const onUserJoined = (payload: {
      userId: string;
      socketId: string;
      publicKey?: string;
    }) => {
      upsertParticipant({
        userId: payload.userId,
        socketId: payload.socketId,
        displayName: displayNameFromUserId(payload.userId),
        publicKey: payload.publicKey,
        isOnline: true,
        joinedAt: Date.now(),
      });
    };

    const onUserLeft = (payload: { userId: string; socketId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== payload.socketId));
    };

    const onDestroyed = () => {
      setParticipants([]);
    };

    const attachAndJoin = () => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode, userId, publicKey });
    };

    socket.on(SOCKET_EVENTS.ROOM_JOINED, onJoined);
    socket.on(SOCKET_EVENTS.USER_JOINED, onUserJoined);
    socket.on(SOCKET_EVENTS.USER_LEFT, onUserLeft);
    socket.on(SOCKET_EVENTS.ROOM_DESTROYED, onDestroyed);

    if (socket.connected) attachAndJoin();
    socket.on('connect', attachAndJoin);

    return () => {
      socket.off('connect', attachAndJoin);
      socket.off(SOCKET_EVENTS.ROOM_JOINED, onJoined);
      socket.off(SOCKET_EVENTS.USER_JOINED, onUserJoined);
      socket.off(SOCKET_EVENTS.USER_LEFT, onUserLeft);
      socket.off(SOCKET_EVENTS.ROOM_DESTROYED, onDestroyed);
    };
  }, [socket, roomCode, userId, publicKey, upsertParticipant]);

  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === userId
          ? {
              ...p,
              socketId: socket?.id ?? p.socketId,
              publicKey: publicKey ?? p.publicKey,
            }
          : p
      )
    );
  }, [socket?.id, userId, publicKey]);

  return { participants, setParticipants };
}
