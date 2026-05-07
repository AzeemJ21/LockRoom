import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { deleteBlobs } from '@/lib/server/fileBlobStore';

interface Participant {
  socketId: string;
  userId: string;
  joinedAt: number;
  publicKey?: string;
}

interface RoomState {
  participants: Map<string, Participant>;
  createdAt: number;
  lastActivity: number;
  inactivityTimer?: ReturnType<typeof setTimeout>;
  tempFiles: Set<string>;
}

export interface CipherRoomSocketData {
  roomCode: string | null;
  userId: string | null;
}

function sd(socket: Socket): CipherRoomSocketData {
  const d = socket.data as Partial<CipherRoomSocketData>;
  if (d.roomCode === undefined) {
    d.roomCode = null;
    d.userId = null;
  }
  return d as CipherRoomSocketData;
}

const rooms = new Map<string, RoomState>();
const INACTIVITY_TIMEOUT = parseInt(process.env.ROOM_INACTIVITY_TIMEOUT_MS || '60000', 10);

/** Used by PATCH /api/rooms/[code] when Mongo has no row but the socket layer still has a live room. */
export function hasLiveSocketRoom(code: string): boolean {
  return rooms.has(code.toUpperCase().trim());
}
const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS_PER_ROOM || '10', 10);

/** Sliding-window rate limit for JOIN_ROOM per remote IP (Socket.IO). */
const JOIN_RATE_WINDOW_MS = 60_000;
const JOIN_RATE_MAX = 10;
const joinAttemptsByIp = new Map<string, number[]>();

function getClientIp(socket: Socket): string {
  const xf = socket.handshake.headers['x-forwarded-for'];
  const fromHeader =
    typeof xf === 'string'
      ? xf.split(',')[0]?.trim()
      : Array.isArray(xf)
        ? xf[0]
        : undefined;
  return fromHeader || socket.handshake.address || 'unknown';
}

function recordJoinAttempt(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - JOIN_RATE_WINDOW_MS;
  const prev = joinAttemptsByIp.get(ip) ?? [];
  const next = prev.filter((t) => t > windowStart);
  if (next.length >= JOIN_RATE_MAX) return false;
  next.push(now);
  joinAttemptsByIp.set(ip, next);
  return true;
}

function detachSocketFromRoom(socket: Socket, io: Server) {
  const data = sd(socket);
  const code = data.roomCode;
  if (!code) return;

  const room = rooms.get(code);
  if (room) {
    room.participants.delete(socket.id);
    socket.leave(code);
    socket.to(code).emit(SOCKET_EVENTS.USER_LEFT, {
      userId: data.userId,
      socketId: socket.id,
    });

    if (room.participants.size === 0) {
      destroyRoom(code, room);
    } else {
      room.inactivityTimer = setTimeout(() => {
        if (!rooms.has(code)) return;
        destroyRoom(code, rooms.get(code)!);
      }, INACTIVITY_TIMEOUT);
    }
  }

  data.roomCode = null;
  data.userId = null;
}

/**
 * Moves live Socket.IO state + adapter rooms when MongoDB room code is renamed.
 * Updates each socket's `socket.data.roomCode` so handlers stay consistent.
 */
export async function migrateRoomSockets(oldCode: string, newCode: string): Promise<boolean> {
  if (oldCode === newCode) return true;
  const io = global.io as Server | undefined;
  const state = rooms.get(oldCode);
  if (!state) return true;
  if (rooms.has(newCode)) return false;

  rooms.set(newCode, state);
  rooms.delete(oldCode);

  if (!io) {
    return true;
  }

  const sockets = await io.in(oldCode).fetchSockets();
  for (const s of sockets) {
    s.leave(oldCode);
    s.join(newCode);
    const d = s.data as CipherRoomSocketData;
    d.roomCode = newCode;
  }

  io.to(newCode).emit(SOCKET_EVENTS.ROOM_CODE_CHANGED, { roomCode: newCode });
  return true;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    sd(socket);

    socket.on(
      SOCKET_EVENTS.JOIN_ROOM,
      async ({ roomCode, userId, publicKey }: Record<string, unknown>) => {
        const ip = getClientIp(socket);
        if (!recordJoinAttempt(ip)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Too many join attempts' });
          return;
        }

        const code = String(roomCode ?? '')
          .toUpperCase()
          .trim();
        if (!code || !/^[A-Z0-9]{6,10}$/.test(code)) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid room code' });
          return;
        }

        if (typeof userId !== 'string' || !userId) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid user' });
          return;
        }

        const data = sd(socket);
        if (data.roomCode === code && data.userId === userId) {
          const room = rooms.get(code);
          if (!room) return;
          const existingParticipants = Array.from(room.participants.values())
            .filter((p) => p.socketId !== socket.id)
            .map((p) => ({
              userId: p.userId,
              socketId: p.socketId,
              publicKey: p.publicKey,
            }));
          socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
            roomCode: code,
            participants: existingParticipants,
          });
          return;
        }

        if (data.roomCode && data.roomCode !== code) {
          detachSocketFromRoom(socket, io);
        }

        const roomBefore = rooms.get(code);
        if (roomBefore && roomBefore.participants.size >= MAX_PARTICIPANTS) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room is full' });
          return;
        }

        data.roomCode = code;
        data.userId = userId;

        if (rooms.has(code)) {
          const room = rooms.get(code)!;
          if (room.inactivityTimer) clearTimeout(room.inactivityTimer);
        } else {
          rooms.set(code, {
            participants: new Map(),
            createdAt: Date.now(),
            lastActivity: Date.now(),
            tempFiles: new Set(),
          });
        }

        const room = rooms.get(code)!;
        room.participants.set(socket.id, {
          socketId: socket.id,
          userId,
          joinedAt: Date.now(),
          publicKey: typeof publicKey === 'string' ? publicKey : undefined,
        });
        room.lastActivity = Date.now();

        socket.join(code);

        socket.to(code).emit(SOCKET_EVENTS.USER_JOINED, {
          userId,
          socketId: socket.id,
          publicKey,
        });

        const existingParticipants = Array.from(room.participants.values())
          .filter((p) => p.socketId !== socket.id)
          .map((p) => ({
            userId: p.userId,
            socketId: p.socketId,
            publicKey: p.publicKey,
          }));

        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          roomCode: code,
          participants: existingParticipants,
        });
      }
    );

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (payload: Record<string, unknown>) => {
      const rc = sd(socket).roomCode;
      if (!rc) return;
      const room = rooms.get(rc);
      if (!room) return;

      room.lastActivity = Date.now();

      socket.to(rc).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        ...payload,
        timestamp: Date.now(),
        fromSocketId: socket.id,
      });
    });

    socket.on(SOCKET_EVENTS.TYPING_START, ({ userId }: { userId?: string }) => {
      const rc = sd(socket).roomCode;
      if (!rc || typeof userId !== 'string') return;
      socket.to(rc).emit(SOCKET_EVENTS.USER_TYPING, { userId, isTyping: true });
    });

    socket.on(SOCKET_EVENTS.TYPING_STOP, ({ userId }: { userId?: string }) => {
      const rc = sd(socket).roomCode;
      if (!rc || typeof userId !== 'string') return;
      socket.to(rc).emit(SOCKET_EVENTS.USER_TYPING, { userId, isTyping: false });
    });

    socket.on(
      SOCKET_EVENTS.CALL_OFFER,
      ({
        targetSocketId,
        offer,
        callType,
        callerId,
      }: {
        targetSocketId?: string;
        offer?: RTCSessionDescriptionInit;
        callType?: string;
        callerId?: string;
      }) => {
        if (!targetSocketId || !offer) return;
        io.to(targetSocketId).emit(SOCKET_EVENTS.INCOMING_CALL, {
          offer,
          callType,
          callerId,
          callerSocketId: socket.id,
        });
      }
    );

    socket.on(
      SOCKET_EVENTS.CALL_ANSWER,
      ({
        targetSocketId,
        answer,
      }: {
        targetSocketId?: string;
        answer?: RTCSessionDescriptionInit;
      }) => {
        if (!targetSocketId || !answer) return;
        io.to(targetSocketId).emit(SOCKET_EVENTS.CALL_ANSWERED, {
          answer,
          answererSocketId: socket.id,
        });
      }
    );

    socket.on(
      SOCKET_EVENTS.ICE_CANDIDATE,
      ({
        targetSocketId,
        candidate,
      }: {
        targetSocketId?: string;
        candidate?: RTCIceCandidateInit;
      }) => {
        if (!targetSocketId || candidate === undefined) return;
        io.to(targetSocketId).emit(SOCKET_EVENTS.ICE_CANDIDATE_RECEIVED, {
          candidate,
          fromSocketId: socket.id,
        });
      }
    );

    socket.on(SOCKET_EVENTS.CALL_END, ({ targetSocketId }: { targetSocketId?: string }) => {
      if (!targetSocketId) return;
      io.to(targetSocketId).emit(SOCKET_EVENTS.CALL_ENDED, { fromSocketId: socket.id });
    });

    socket.on(
      SOCKET_EVENTS.KEY_EXCHANGE,
      ({ targetSocketId, publicKey }: { targetSocketId?: string; publicKey?: string }) => {
        if (!targetSocketId || typeof publicKey !== 'string') return;
        io.to(targetSocketId).emit(SOCKET_EVENTS.KEY_RECEIVED, {
          publicKey,
          fromSocketId: socket.id,
          userId: sd(socket).userId,
        });
      }
    );

    socket.on(SOCKET_EVENTS.FILE_UPLOADED, ({ fileId }: { fileId?: string }) => {
      const rc = sd(socket).roomCode;
      if (!rc || typeof fileId !== 'string') return;
      const room = rooms.get(rc);
      if (room) room.tempFiles.add(fileId);
    });

    socket.on('disconnect', () => {
      detachSocketFromRoom(socket, io);
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
      socket.disconnect(true);
    });
  });
}

function destroyRoom(code: string, room: RoomState) {
  if (room.inactivityTimer) clearTimeout(room.inactivityTimer);

  const ioServer = global.io;
  if (ioServer) {
    ioServer.to(code).emit(SOCKET_EVENTS.ROOM_DESTROYED, {
      reason: 'All users left or inactivity timeout',
    });
    ioServer.in(code).socketsLeave(code);
  }

  rooms.delete(code);

  void deleteRoomMetadata(code);
  void deleteBlobs(room.tempFiles);

  console.log(`[Room ${code}] Destroyed. All state wiped.`);
}

async function deleteRoomMetadata(code: string) {
  try {
    const { connectMongo } = await import('@/lib/db/mongodb');
    const { Room } = await import('@/lib/db/models/Room');
    await connectMongo();
    await Room.deleteOne({ code });
  } catch {
    /* Mongo optional */
  }
}
