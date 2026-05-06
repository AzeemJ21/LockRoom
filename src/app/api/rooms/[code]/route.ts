import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongodb';
import { Room } from '@/lib/db/models/Room';

export async function DELETE(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const normalized = code.toUpperCase().trim();
  if (!/^[A-Z0-9]{6,10}$/.test(normalized)) {
    return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
  }

  try {
    await connectMongo();
    await Room.deleteOne({ code: normalized });
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const io = global.io;
  io?.in(normalized).disconnectSockets(true);

  return NextResponse.json({ ok: true });
}
