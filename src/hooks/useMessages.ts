'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Message } from '@/lib/types/message.types';
import type { Participant } from '@/lib/types/room.types';
import { displayNameFromUserId } from '@/lib/utils/displayName';

interface UseMessagesArgs {
  socket: Socket | null;
  roomCode: string;
  userId: string;
  participants: Participant[];
  encryptForPeers: (text: string, peerUserIds: string[]) => Promise<Record<string, { ciphertext: string; iv: string }>>;
  decrypt: (ciphertext: string, iv: string, peerId?: string) => Promise<string | null>;
}

export function useMessages({
  socket,
  roomCode,
  userId,
  participants,
  encryptForPeers,
  decrypt,
}: UseMessagesArgs) {
  const [messages, setMessages] = useState<Message[]>([]);

  const sendText = useCallback(
    async (text: string) => {
      if (!socket?.connected || !text.trim()) return;

      const peerIds = participants.filter((p) => p.userId !== userId).map((p) => p.userId);
      if (peerIds.length === 0) {
        return;
      }

      const envelopes = await encryptForPeers(text, peerIds);

      const msg: Message = {
        id: uuidv4(),
        type: 'text',
        senderId: userId,
        senderName: displayNameFromUserId(userId),
        timestamp: Date.now(),
        envelopes,
      };

      setMessages((prev) => [...prev, { ...msg, decryptedContent: text }]);

      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        roomCode,
        message: msg,
      });
    },
    [socket, roomCode, userId, participants, encryptForPeers]
  );

  useEffect(() => {
    if (!socket) return;

    const onNew = async (payload: {
      message: Message;
      timestamp: number;
      fromSocketId: string;
    }) => {
      const base: Message = {
        ...payload.message,
        timestamp: payload.timestamp,
      };

      let decrypted: string | undefined;
      const env = base.envelopes?.[userId];
      if (env) {
        const peerSender = base.senderId;
        decrypted = (await decrypt(env.ciphertext, env.iv, peerSender)) ?? undefined;
      } else if (base.encrypted) {
        decrypted =
          (await decrypt(base.encrypted.ciphertext, base.encrypted.iv, base.senderId)) ?? undefined;
      }

      setMessages((prev) => [
        ...prev,
        {
          ...base,
          decryptedContent: decrypted,
        },
      ]);
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onNew);

    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onNew);
    };
  }, [socket, userId, decrypt]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, sendText, clear };
}
