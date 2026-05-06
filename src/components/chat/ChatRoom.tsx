'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSocket } from '@/hooks/useSocket';
import { useEncryption } from '@/hooks/useEncryption';
import { useRoom } from '@/hooks/useRoom';
import { useMessages } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';
import { useCleanup } from '@/hooks/useCleanup';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { keyStore } from '@/lib/crypto/keyStore';
import { isValidRoomCode } from '@/lib/utils/roomCode';
import { useToast } from '@/components/ui/Toast';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { CallManager } from '@/components/calling/CallManager';
import { BlurOverlay } from '@/components/privacy/BlurOverlay';
import { ScreenshotWarning } from '@/components/privacy/ScreenshotWarning';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function ChatRoom({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { push } = useToast();

  const [userId] = useState(() => {
    if (typeof window === 'undefined') return uuidv4();
    const existing = sessionStorage.getItem('cipher_uid');
    if (existing) return existing;
    const id = uuidv4();
    sessionStorage.setItem('cipher_uid', id);
    return id;
  });

  const { socket, status } = useSocket();
  const { initialize, isReady, publicKeyBase64, establishSharedKey, encryptForPeers, decrypt, wipe } =
    useEncryption();

  const { participants } = useRoom(socket, roomCode, userId, isReady ? publicKeyBase64 : undefined);

  const [cryptoEpoch, setCryptoEpoch] = useState(0);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  const { messages, sendText } = useMessages({
    socket,
    roomCode,
    userId,
    participants,
    encryptForPeers,
    decrypt,
  });

  const { notifyTyping, stopTyping } = useTyping(socket, userId);
  const { wipeAndExit } = useCleanup(socket, router);

  const rtc = useWebRTC(socket, userId);

  const peer = useMemo(
    () => participants.find((p) => p.userId !== userId && Boolean(p.socketId)),
    [participants, userId]
  );

  const sharedUploadKey = keyStore.getFirstSharedKey() ?? null;
  const { uploadEncryptedFile } = useMediaUpload(sharedUploadKey);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!socket || !isReady || !publicKeyBase64) return;

    const flushKeys = () => {
      participants.forEach((p) => {
        if (p.userId === userId) return;
        if (!p.socketId) return;
        socket.emit(SOCKET_EVENTS.KEY_EXCHANGE, {
          targetSocketId: p.socketId,
          publicKey: publicKeyBase64,
        });
      });
    };

    flushKeys();
  }, [socket, isReady, publicKeyBase64, participants, userId]);

  useEffect(() => {
    if (!socket) return;

    const onKey = async (payload: { publicKey?: string; userId?: string }) => {
      if (!payload.publicKey || !payload.userId) return;
      if (payload.userId === userId) return;
      try {
        await establishSharedKey(payload.userId, payload.publicKey);
        setCryptoEpoch((x) => x + 1);
      } catch {
        push('Could not complete key exchange.', 'error');
      }
    };

    const onTyping = (payload: { userId?: string; isTyping?: boolean }) => {
      if (!payload.userId) return;
      setTypingMap((m) => ({ ...m, [payload.userId!]: Boolean(payload.isTyping) }));
    };

    socket.on(SOCKET_EVENTS.KEY_RECEIVED, onKey);
    socket.on(SOCKET_EVENTS.USER_TYPING, onTyping);

    return () => {
      socket.off(SOCKET_EVENTS.KEY_RECEIVED, onKey);
      socket.off(SOCKET_EVENTS.USER_TYPING, onTyping);
    };
  }, [socket, establishSharedKey, userId, push]);

  useEffect(() => {
    const onDestroy = () => {
      wipe();
      push('Room was destroyed.', 'info');
      router.push('/');
    };
    socket?.on(SOCKET_EVENTS.ROOM_DESTROYED, onDestroy);
    return () => {
      socket?.off(SOCKET_EVENTS.ROOM_DESTROYED, onDestroy);
    };
  }, [socket, wipe, router, push]);

  void cryptoEpoch;
  const encryptionReady = (() => {
    const peers = participants.filter((p) => p.userId !== userId);
    if (!peers.length) return true;
    return peers.every((p) => Boolean(keyStore.getSharedKey(p.userId)));
  })();

  const typingNames = participants
    .filter((p) => p.userId !== userId && typingMap[p.userId])
    .map((p) => p.displayName);

  const onLeave = () => {
    wipe();
    wipeAndExit();
  };

  const onPanic = () => {
    wipe();
    wipeAndExit();
  };

  if (!isValidRoomCode(roomCode)) {
    return (
      <div className="p-8 text-sm text-text-secondary">
        Invalid room code.{' '}
        <button type="button" className="text-accent-primary underline" onClick={() => router.push('/')}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative flex h-[100dvh] min-h-0 flex-col bg-background-primary">
        <BlurOverlay />
        <ScreenshotWarning />

        <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-background-secondary/40 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-text-muted">cipher</div>
            <div className="truncate font-mono text-sm text-text-primary">
              Room <span className="text-accent-primary">{roomCode}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus status={status} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1 flex-col">
            <CallManager socket={socket} rtc={rtc} peerSocketId={peer?.socketId} />

            <MessageList messages={messages} userId={userId} />

            <TypingIndicator names={typingNames} />

            <MessageInput
              disabled={!encryptionReady || status !== 'connected'}
              onSendText={async (t) => {
                try {
                  await sendText(t);
                } catch {
                  push('Could not encrypt/send message.', 'error');
                }
              }}
              onTyping={notifyTyping}
              onStopTyping={stopTyping}
              onUploadFile={async (file) => {
                const res = await uploadEncryptedFile(file);
                if (!res) {
                  push('Upload requires an established encryption key.', 'error');
                  return;
                }
                socket?.emit(SOCKET_EVENTS.FILE_UPLOADED, { fileId: res.fileId });
                push(`Encrypted upload complete (${res.fileId.slice(0, 6)}…).`);
              }}
            />
          </div>

          <Sidebar
            roomCode={roomCode}
            participants={participants}
            userId={userId}
            onLeave={onLeave}
            onCallAudio={() => {
              if (!peer?.socketId) {
                push('No peer connected for calling yet.', 'error');
                return;
              }
              void rtc.startCall(peer.socketId, 'audio');
            }}
            onCallVideo={() => {
              if (!peer?.socketId) {
                push('No peer connected for calling yet.', 'error');
                return;
              }
              void rtc.startCall(peer.socketId, 'video');
            }}
            onCallScreen={() => {
              if (!peer?.socketId) {
                push('No peer connected for calling yet.', 'error');
                return;
              }
              void rtc.startCall(peer.socketId, 'screen');
            }}
            onPanic={onPanic}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
