'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { ChatReplyRef, MediaDescriptor, Message, MessageType } from '@/lib/types/message.types';
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

function mapMediaKindToMessageType(kind: MediaDescriptor['kind']): MessageType {
  if (kind === 'image') return 'image';
  if (kind === 'video') return 'video';
  if (kind === 'audio') return 'audio';
  return 'file';
}

function buildTextPayload(body: string, replyTo?: ChatReplyRef): string {
  return JSON.stringify({ v: 1, type: 'text', body, ...(replyTo ? { replyTo } : {}) });
}

function buildMediaPayload(media: MediaDescriptor, replyTo?: ChatReplyRef): string {
  return JSON.stringify({
    v: 1,
    type: 'media',
    kind: media.kind,
    fileId: media.fileId,
    name: media.name,
    mime: media.mime,
    ...(replyTo ? { replyTo } : {}),
  });
}

function parseDecryptedPayload(raw: string): {
  text?: string;
  media?: MediaDescriptor;
  replyTo?: ChatReplyRef;
  legacyText?: string;
} {
  try {
    const j = JSON.parse(raw) as {
      v?: number;
      type?: string;
      body?: string;
      replyTo?: ChatReplyRef;
      kind?: MediaDescriptor['kind'];
      fileId?: string;
      name?: string;
      mime?: string;
    };
    if (j.type === 'text' && typeof j.body === 'string') {
      return { text: j.body, replyTo: j.replyTo };
    }
    if (
      j.type === 'media' &&
      j.fileId &&
      j.name &&
      j.mime &&
      j.kind &&
      ['image', 'video', 'audio', 'file'].includes(j.kind)
    ) {
      return {
        media: { kind: j.kind, fileId: j.fileId, name: j.name, mime: j.mime },
        replyTo: j.replyTo,
      };
    }
  } catch {
    /* legacy plaintext */
  }
  return { legacyText: raw };
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
    async (text: string, replyTo?: ChatReplyRef) => {
      if (!socket?.connected || !text.trim()) return;

      const peerIds = participants.filter((p) => p.userId !== userId).map((p) => p.userId);
      if (peerIds.length === 0) {
        return;
      }

      const payload = buildTextPayload(text.trim(), replyTo);
      const envelopes = await encryptForPeers(payload, peerIds);

      const msg: Message = {
        id: uuidv4(),
        type: 'text',
        senderId: userId,
        senderName: displayNameFromUserId(userId),
        timestamp: Date.now(),
        envelopes,
        decryptedContent: text.trim(),
        replyTo,
      };

      setMessages((prev) => [...prev, msg]);

      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        roomCode,
        message: msg,
      });
    },
    [socket, roomCode, userId, participants, encryptForPeers]
  );

  const sendMediaMessage = useCallback(
    async (media: MediaDescriptor, replyTo?: ChatReplyRef) => {
      if (!socket?.connected) return;

      const peerIds = participants.filter((p) => p.userId !== userId).map((p) => p.userId);
      if (peerIds.length === 0) return;

      const payload = buildMediaPayload(media, replyTo);
      const envelopes = await encryptForPeers(payload, peerIds);

      const msg: Message = {
        id: uuidv4(),
        type: mapMediaKindToMessageType(media.kind),
        senderId: userId,
        senderName: displayNameFromUserId(userId),
        timestamp: Date.now(),
        envelopes,
        media,
        replyTo,
      };

      setMessages((prev) => [...prev, msg]);

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

      let decryptedRaw: string | undefined;
      const env = base.envelopes?.[userId];
      if (env) {
        const peerSender = base.senderId;
        decryptedRaw = (await decrypt(env.ciphertext, env.iv, peerSender)) ?? undefined;
      } else if (base.encrypted) {
        decryptedRaw =
          (await decrypt(base.encrypted.ciphertext, base.encrypted.iv, base.senderId)) ?? undefined;
      }

      let decryptedContent: string | undefined;
      let replyTo: ChatReplyRef | undefined;
      let media: MediaDescriptor | undefined;

      if (decryptedRaw !== undefined) {
        const parsed = parseDecryptedPayload(decryptedRaw);
        if (parsed.text !== undefined) {
          decryptedContent = parsed.text;
          replyTo = parsed.replyTo;
        } else if (parsed.media) {
          media = parsed.media;
          replyTo = parsed.replyTo;
          decryptedContent =
            parsed.media.kind === 'audio'
              ? '🎤 Voice message'
              : parsed.media.kind === 'image'
                ? '🖼 Image'
                : parsed.media.kind === 'video'
                  ? '🎬 Video'
                  : `📎 ${parsed.media.name}`;
        } else if (parsed.legacyText !== undefined) {
          decryptedContent = parsed.legacyText;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          ...base,
          decryptedContent,
          replyTo,
          media,
        },
      ]);
    };

    socket.on(SOCKET_EVENTS.NEW_MESSAGE, onNew);

    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE, onNew);
    };
  }, [socket, userId, decrypt]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, sendText, sendMediaMessage, clear };
}
