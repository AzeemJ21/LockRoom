import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns ICE servers for WebRTC. STUN is always safe to expose.
 * When `TURN_SERVER_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` are set,
 * TURN is included here so credentials never need `NEXT_PUBLIC_*` env vars.
 */
export async function GET() {
  const stunList =
    process.env.NEXT_PUBLIC_STUN_SERVERS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? ['stun:stun.l.google.com:19302'];

  type IceServerJson = { urls: string | string[]; username?: string; credential?: string };

  const iceServers: IceServerJson[] = stunList.map((urls) => ({ urls }));

  const turnUrl = process.env.TURN_SERVER_URL?.trim();
  const turnUser = process.env.TURN_USERNAME?.trim();
  const turnCred = process.env.TURN_CREDENTIAL?.trim();
  if (turnUrl && turnUser && turnCred) {
    const urls = turnUrl.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length) {
      iceServers.push({
        urls,
        username: turnUser,
        credential: turnCred,
      });
    }
  }

  return NextResponse.json(
    { iceServers },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
