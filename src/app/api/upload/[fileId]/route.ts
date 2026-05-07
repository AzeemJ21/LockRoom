import { NextResponse } from 'next/server';
import { loadBlob } from '@/lib/server/fileBlobStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns ciphertext metadata so the client can decrypt locally with the shared room key. */
export async function GET(_req: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params;
  if (!fileId || !/^[0-9a-f-]{36}$/i.test(fileId)) {
    return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
  }

  const meta = await loadBlob(fileId);
  if (!meta) {
    return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  }

  return NextResponse.json({
    iv: meta.iv,
    data: meta.data,
    mime: meta.mime,
    name: meta.name,
  });
}
