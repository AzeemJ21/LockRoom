'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Phone, ScreenShare, Video } from 'lucide-react';
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
import { resolveMimeForFile } from '@/lib/utils/fileUtils';
import { messageReplyPreview } from '@/lib/utils/messagePreview';
import type { MediaDescriptor, Message } from '@/lib/types/message.types';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { CallManager } from '@/components/calling/CallManager';
import { BlurOverlay } from '@/components/privacy/BlurOverlay';
import { ScreenshotWarning } from '@/components/privacy/ScreenshotWarning';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RenameRoomButton } from '@/components/sidebar/RenameRoomButton';

function mimeToKind(mime: string): MediaDescriptor['kind'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

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

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const { socket, status } = useSocket();
  const { initialize, isReady, publicKeyBase64, establishSharedKey, encryptForPeers, decrypt, wipe } =
    useEncryption();

  const { participants } = useRoom(socket, roomCode, userId, isReady ? publicKeyBase64 : undefined);

  const [cryptoEpoch, setCryptoEpoch] = useState(0);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  const { messages, sendText, sendMediaMessage, clear } = useMessages({
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

  const sharedUploadKey = useMemo(() => {
    const remotePeers = participants.filter((p) => p.userId !== userId);
    if (remotePeers.length === 1) {
      const only = remotePeers[0]!;
      const k = keyStore.getSharedKey(only.userId);
      if (k) return k;
    }
    return keyStore.getFirstSharedKey() ?? null;
  }, [cryptoEpoch, participants, userId]);
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

  /** Derive AES keys as soon as we know a peer's public key from the room (not only via KEY_RECEIVED). */
  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;

    const syncKeysFromParticipants = async () => {
      for (const p of participants) {
        if (p.userId === userId) continue;
        if (!p.publicKey) continue;
        if (keyStore.getSharedKey(p.userId)) continue;

        try {
          await establishSharedKey(p.userId, p.publicKey);
          if (!cancelled) setCryptoEpoch((x) => x + 1);
        } catch {
          /* KEY_RECEIVED may retry later */
        }
      }
    };

    void syncKeysFromParticipants();

    return () => {
      cancelled = true;
    };
  }, [participants, userId, isReady, establishSharedKey]);

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
      clear();
      wipe();
      push('Room was destroyed.', 'info');
      router.push('/');
    };
    socket?.on(SOCKET_EVENTS.ROOM_DESTROYED, onDestroy);
    return () => {
      socket?.off(SOCKET_EVENTS.ROOM_DESTROYED, onDestroy);
    };
  }, [socket, wipe, router, push, clear]);

  useEffect(() => {
    if (!socket) return;
    const onCodeChanged = (payload: { roomCode?: string }) => {
      if (typeof payload?.roomCode === 'string' && isValidRoomCode(payload.roomCode)) {
        router.replace(`/room/${payload.roomCode}`);
      }
    };
    socket.on(SOCKET_EVENTS.ROOM_CODE_CHANGED, onCodeChanged);
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_CODE_CHANGED, onCodeChanged);
    };
  }, [socket, router]);

  /** Join denied (invalid code, full room, rate limit, etc.) — server emits consistent UX message. */
  useEffect(() => {
    if (!socket) return;

    const onRoomError = (payload: { message?: string }) => {
      const msg =
        typeof payload?.message === 'string' && payload.message.trim()
          ? payload.message.trim()
          : 'Could not join this room.';
      push(msg, 'error');
      router.replace('/');
    };

    socket.on(SOCKET_EVENTS.ERROR, onRoomError);
    return () => {
      socket.off(SOCKET_EVENTS.ERROR, onRoomError);
    };
  }, [socket, push, router]);

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
    clear();
    wipe();
    wipeAndExit();
  };

  const onPanic = () => {
    clear();
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

        <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-background-secondary/40 px-3 py-3 backdrop-blur sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-text-muted">cipher</div>
            <div className="truncate font-mono text-sm text-text-primary">
              Room <span className="text-accent-primary">{roomCode}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="lg:hidden">
              <RenameRoomButton roomCode={roomCode} compact className="h-10 w-10 shrink-0 px-0" />
            </div>
            <ConnectionStatus status={status} />
          </div>
        </header>

        <nav
          className="flex shrink-0 items-center justify-center gap-3 border-b border-white/10 bg-background-secondary/90 px-3 py-2.5 backdrop-blur lg:hidden"
          aria-label="Call actions"
        >
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-[44px] min-w-[44px] border border-white/15 px-0 text-accent-primary"
            disabled={!peer?.socketId || status !== 'connected'}
            aria-label="Audio call"
            onClick={() => {
              if (!peer?.socketId) {
                push('No peer connected for calling yet.', 'error');
                return;
              }
              void rtc.startCall(peer.socketId, 'audio');
            }}
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-[44px] min-w-[44px] border border-white/15 px-0 text-accent-primary"
            disabled={!peer?.socketId || status !== 'connected'}
            aria-label="Video call"
            onClick={() => {
              if (!peer?.socketId) {
                push('No peer connected for calling yet.', 'error');
                return;
              }
              void rtc.startCall(peer.socketId, 'video');
            }}
          >
            <Video className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-[44px] min-w-[44px] border border-white/15 px-0 text-accent-primary"
            disabled={!peer?.socketId || status !== 'connected'}
            aria-label="Share screen"
            onClick={() => {
              if (!peer?.socketId) {
                push('No peer connected for calling yet.', 'error');
                return;
              }
              void rtc.startCall(peer.socketId, 'screen');
            }}
          >
            <ScreenShare className="h-5 w-5" />
          </Button>
        </nav>

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1 flex-col">
            <CallManager socket={socket} rtc={rtc} peerSocketId={peer?.socketId} />

            <MessageList
              messages={messages}
              userId={userId}
              onReply={(m) => setReplyingTo(m)}
            />

            <TypingIndicator names={typingNames} />

            <MessageInput
              disabled={!encryptionReady || status !== 'connected'}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onSendText={async (t) => {
                const replySnap =
                  replyingTo ? { id: replyingTo.id, preview: messageReplyPreview(replyingTo) } : undefined;
                try {
                  await sendText(t, replySnap);
                  setReplyingTo(null);
                } catch {
                  push('Could not encrypt/send message.', 'error');
                }
              }}
              onTyping={notifyTyping}
              onStopTyping={stopTyping}
              onUploadFile={async (file) => {
                const replySnap =
                  replyingTo ? { id: replyingTo.id, preview: messageReplyPreview(replyingTo) } : undefined;
                try {
                  const res = await uploadEncryptedFile(file);
                  if (!res) {
                    const hasPeer = participants.some((p) => p.userId !== userId);
                    push(
                      hasPeer
                        ? 'Encryption is still pairing with your peer — try again in a moment.'
                        : 'Wait for someone to join the room before sending files.',
                      'error'
                    );
                    return;
                  }
                  socket?.emit(SOCKET_EVENTS.FILE_UPLOADED, { fileId: res.fileId });
                  const resolvedMime = resolveMimeForFile(file);
                  const media: MediaDescriptor = {
                    kind: mimeToKind(resolvedMime),
                    fileId: res.fileId,
                    name: file.name,
                    mime: resolvedMime,
                  };
                  await sendMediaMessage(media, replySnap);
                  setReplyingTo(null);
                  push('Encrypted file sent.');
                } catch (err) {
                  push(err instanceof Error ? err.message : 'Could not send file.', 'error');
                }
              }}
              onVoiceBlob={async (blob) => {
                const replySnap =
                  replyingTo ? { id: replyingTo.id, preview: messageReplyPreview(replyingTo) } : undefined;
                try {
                  const ext = blob.type.includes('webm') ? 'webm' : 'ogg';
                  const file = new File([blob], `voice-${Date.now()}.${ext}`, {
                    type: blob.type || 'audio/webm',
                  });
                  const res = await uploadEncryptedFile(file);
                  if (!res) {
                    const hasPeer = participants.some((p) => p.userId !== userId);
                    push(
                      hasPeer
                        ? 'Encryption is still pairing with your peer — try again in a moment.'
                        : 'Wait for someone to join the room before sending files.',
                      'error'
                    );
                    return;
                  }
                  socket?.emit(SOCKET_EVENTS.FILE_UPLOADED, { fileId: res.fileId });
                  await sendMediaMessage(
                    {
                      kind: 'audio',
                      fileId: res.fileId,
                      name: file.name,
                      mime: file.type || 'audio/webm',
                    },
                    replySnap
                  );
                  setReplyingTo(null);
                } catch {
                  push('Could not send voice message.', 'error');
                }
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
