import { ROOM_CODE_REGEX } from '@/lib/utils/constants';

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().trim();
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(normalizeRoomCode(code));
}

/** Cryptographically strong-ish room codes using Web Crypto (browser). */
export async function generateRoomCode(length = 8): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
