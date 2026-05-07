const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/m4a',
  'video/webm',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'text/plain',
]);

/** Browsers / OS quirks (e.g. `image/jpg` is common but not in our allow-list). */
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

export function normalizeMime(mime: string): string {
  const key = mime.toLowerCase().trim();
  return MIME_ALIASES[key] ?? mime;
}

/** Extension fallback — iOS/Android often pick files with an empty `File.type`. */
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  webm: 'video/webm',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
  pdf: 'application/pdf',
  txt: 'text/plain',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
};

export function resolveMimeForFile(file: File): string {
  const t = file.type?.trim();
  /** MediaRecorder / browsers often send `video/webm;codecs=vp9,opus` — allow-list is primary type only. */
  if (t) return normalizeMime(t.split(';')[0]?.trim() ?? t);
  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot + 1) : '';
  const fromExt = ext ? EXT_TO_MIME[ext] : '';
  return fromExt ? normalizeMime(fromExt) : '';
}

/** First bytes when `File.type` and extension are missing (common on mobile camera rolls). */
export function sniffMimeFromMagic(head: ArrayBuffer): string | null {
  const u = new Uint8Array(head);
  if (u.length < 12) return null;
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x38) return 'image/gif';
  if (u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && u.length >= 12) {
    const webp =
      u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50 ? 'image/webp' : null;
    if (webp) return webp;
  }
  return null;
}

export function isAllowedMime(mime: string): boolean {
  if (!mime) return false;
  const primary = normalizeMime(mime.split(';')[0]?.trim() ?? mime);
  return ALLOWED.has(primary);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
