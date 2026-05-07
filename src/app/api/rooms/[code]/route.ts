import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectMongo } from '@/lib/db/mongodb';
import { Room } from '@/lib/db/models/Room';
import { hasLiveSocketRoom, migrateRoomSockets } from '@/server/socketServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBodySchema = z.object({
  newCode: z.string().min(1).max(24),
});

export async function PATCH(req: Request, { params }: { params: { code: string } }) {
  const rawCode = params.code ?? '';
  const oldCode = decodeURIComponent(rawCode).toUpperCase().trim();
  if (!oldCode || !/^[A-Z0-9]{6,10}$/.test(oldCode)) {
    return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const newCode = parsed.data.newCode
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
  if (newCode.length < 6 || newCode.length > 10) {
    return NextResponse.json({ error: 'New code must be 6–10 letters or digits' }, { status: 400 });
  }
  if (newCode === oldCode) {
    return NextResponse.json({ code: newCode });
  }

  try {
    await connectMongo();
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const taken = await Room.findOne({ code: newCode }).lean();
  if (taken) {
    return NextResponse.json({ error: 'That room code is already taken' }, { status: 409 });
  }

  const updatedFromDb = await Room.findOneAndUpdate(
    { code: oldCode },
    { $set: { code: newCode, lastActivity: new Date() } },
    { new: true }
  ).lean();

  if (updatedFromDb) {
    const migrated = await migrateRoomSockets(oldCode, newCode);
    if (!migrated) {
      await Room.updateOne({ code: newCode }, { $set: { code: oldCode, lastActivity: new Date() } }).catch(
        () => {}
      );
      return NextResponse.json(
        { error: 'That code is in use by an active session. Try a different one.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ code: newCode });
  }

  /**
   * No `Room` document for `oldCode` — happens when people open `/room/CODE` without using
   * “Create room” (Mongo row), or Mongo was offline at creation. If Socket.IO still has this room,
   * rename there and create metadata for `newCode`.
   */
  if (!hasLiveSocketRoom(oldCode)) {
    return NextResponse.json(
      {
        error:
          'No active room found for this code. Use “Create room” on the home page if MongoDB is required, or rejoin the room and try again.',
      },
      { status: 404 }
    );
  }

  const migrated = await migrateRoomSockets(oldCode, newCode);
  if (!migrated) {
    return NextResponse.json(
      { error: 'That code is in use by an active session. Try a different one.' },
      { status: 409 }
    );
  }

  try {
    await Room.create({
      code: newCode,
      lastActivity: new Date(),
      participantCount: 0,
      isActive: true,
    });
  } catch {
    await migrateRoomSockets(newCode, oldCode).catch(() => {});
    return NextResponse.json({ error: 'Could not save the new room code. Try another.' }, { status: 409 });
  }

  return NextResponse.json({ code: newCode });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const rawCode = params.code ?? '';
  const normalized = decodeURIComponent(rawCode).toUpperCase().trim();
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
