/**
 * Custom Node entry: Next.js + Express (rate limits) + Socket.IO on one HTTP server.
 * TURN credentials stay server-side; clients only receive STUN/TURN via WebRTC config assembled client-side
 * from NEXT_PUBLIC_STUN_SERVERS (never raw TURN passwords in client bundles — use short-lived tokens from your provider).
 */
import './load-env';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/server/socketServer';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

const joinRoomLimiter = rateLimit({
  windowMs: 60_000,
  /** Local dev hits this quickly when testing — keep prod strict */
  max: dev ? 300 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many room API requests, try again shortly.' },
});

async function main() {
  await nextApp.prepare();

  const expressApp = express();
  expressApp.set('trust proxy', 1);
  /**
   * Do not use `express.json()` globally before Next's handler — it consumes the body stream so
   * Route Handlers like POST `/api/upload` see an empty body or fail unpredictably.
   */
  expressApp.use('/api/rooms', joinRoomLimiter);

  // Express 5 / path-to-regexp v8: avoid `*` patterns — delegate everything else to Next.js.
  expressApp.use((req: Request, res: Response) => {
    const parsedUrl = parse(req.url ?? '', true);
    return handle(req, res, parsedUrl);
  });

  const httpServer = createServer(expressApp);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  global.io = io;

  setupSocketHandlers(io);

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${PORT} is already in use. Close the other terminal/process using it (often another "npm run dev"), or change PORT in .env.local.\nOn Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    console.log(`> Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
