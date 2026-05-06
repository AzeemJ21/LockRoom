export const ROOM_CODE_REGEX = /^[A-Z0-9]{6,10}$/;

const mbFromEnv = () =>
  Math.max(1, parseInt(process.env.MAX_FILE_SIZE_MB || process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '25', 10));

export const MAX_FILE_SIZE_BYTES = mbFromEnv() * 1024 * 1024;
