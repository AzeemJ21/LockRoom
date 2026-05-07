import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { connectMongo } from '@/lib/db/mongodb';
import { mongoConnectUserHint } from '@/lib/db/mongoErrors';
import { Room } from '@/lib/db/models/Room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function generateRoomCode(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/** POST creates metadata-only room rows — never stores conversation content. */
export async function POST(req: Request) {
  try {
    let requestedCode: string | undefined;
    try {
      const body = (await req.json()) as { code?: unknown };
      if (typeof body?.code === 'string') {
        requestedCode = body.code.toUpperCase().trim();
      }
    } catch {
      /* empty body */
    }

    try {
      await connectMongo();
    } catch (err) {
      const hint = mongoConnectUserHint(err);
      const message = err instanceof Error ? err.message : String(err);
      const detail =
        process.env.NODE_ENV === 'development'
          ? [message, hint].filter(Boolean).join(' ')
          : undefined;
      if (process.env.NODE_ENV === 'development') {
        console.error('[api/rooms POST] MongoDB connection failed:', err);
      }
      return NextResponse.json(
        {
          error: 'Database unavailable',
          ...(detail ? { detail } : {}),
        },
        { status: 503 }
      );
    }

    if (requestedCode) {
      if (!/^[A-Z0-9]{6,10}$/.test(requestedCode)) {
        return NextResponse.json(
          { error: 'Custom codes must be 6–10 letters or digits' },
          { status: 400 }
        );
      }
      const taken = await Room.findOne({ code: requestedCode }).lean();
      if (taken) {
        return NextResponse.json({ error: 'That room code is already taken' }, { status: 409 });
      }
      try {
        await Room.create({
          code: requestedCode,
          lastActivity: new Date(),
          participantCount: 0,
          isActive: true,
        });
        return NextResponse.json({ code: requestedCode });
      } catch (err) {
        const detail =
          process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined;
        return NextResponse.json(
          {
            error: 'Could not create room with that code',
            ...(detail ? { detail } : {}),
          },
          { status: 500 }
        );
      }
    }

    let lastCreateError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode(10);
      try {
        await Room.create({
          code,
          lastActivity: new Date(),
          participantCount: 0,
          isActive: true,
        });
        return NextResponse.json({ code });
      } catch (err) {
        lastCreateError = err;
        if (process.env.NODE_ENV === 'development') {
          console.error('[api/rooms POST] Room.create failed:', err);
        }
        continue;
      }
    }

    const detail =
      process.env.NODE_ENV === 'development' && lastCreateError instanceof Error
        ? lastCreateError.message
        : undefined;

    return NextResponse.json(
      {
        error: 'Could not allocate room code',
        ...(detail ? { detail } : {}),
      },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/rooms POST] Unhandled error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' ? { detail: message } : {}),
      },
      { status: 500 }
    );
  }
}

/** GET checks whether a room code exists in metadata store (not authoritative for Socket.IO memory rooms). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code')?.toUpperCase().trim();
    if (!code || !/^[A-Z0-9]{6,10}$/.test(code)) {
      return NextResponse.json({ exists: false, error: 'Invalid code' }, { status: 400 });
    }

    try {
      await connectMongo();
    } catch {
      return NextResponse.json({ exists: false, offline: true }, { status: 200 });
    }

    const doc = await Room.findOne({ code }).lean();
    return NextResponse.json({ exists: Boolean(doc) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/rooms GET]', err);
    return NextResponse.json(
      {
        exists: false,
        error: 'Request failed',
        ...(process.env.NODE_ENV === 'development' ? { detail: message } : {}),
      },
      { status: 500 }
    );
  }
}
