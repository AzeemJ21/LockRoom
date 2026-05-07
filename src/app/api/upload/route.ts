import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { isAllowedMime } from '@/lib/utils/fileUtils';
import { MAX_FILE_SIZE_BYTES } from '@/lib/utils/constants';
import { saveBlob } from '@/lib/server/fileBlobStore';

const BodySchema = z.object({
  name: z.string().max(240),
  mime: z.string().max(120),
  iv: z.string().max(64),
  data: z.string(),
});

const UPLOAD_TTL_SEC = 3600;

/** Stores ciphertext-only blobs temporarily — plaintext never touches MongoDB. */
export async function POST(req: Request) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { mime } = parsed.data;
  if (!isAllowedMime(mime)) {
    return NextResponse.json({ error: 'Unsupported MIME type' }, { status: 415 });
  }

  let raw: Buffer;
  try {
    raw = Buffer.from(parsed.data.data, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid base64' }, { status: 400 });
  }

  if (raw.length > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const fileId = uuidv4();
  await saveBlob(
    fileId,
    {
      iv: parsed.data.iv,
      data: parsed.data.data,
      mime: parsed.data.mime,
      name: parsed.data.name,
    },
    UPLOAD_TTL_SEC
  );

  return NextResponse.json({ fileId });
}
