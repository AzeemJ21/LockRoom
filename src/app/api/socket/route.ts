import { NextResponse } from 'next/server';

/** Lightweight health endpoint — Socket.IO attaches on the Node HTTP server in `server.ts`. */
export async function GET() {
  return NextResponse.json({ ok: true, transport: 'socket.io' });
}
