import type { Server as HTTPServer } from 'http';
import { Server as IOServer } from 'socket.io';

/**
 * Shared Socket.IO factory — keeps CORS/transports consistent with `server.ts`.
 */
export function createSocketIOServer(httpServer: HTTPServer): IOServer {
  return new IOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });
}
