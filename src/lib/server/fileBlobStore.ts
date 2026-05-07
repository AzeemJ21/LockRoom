import { getRedis } from '@/lib/redis/client';

export type StoredBlobMeta = {
  iv: string;
  /** Base64 ciphertext */
  data: string;
  mime: string;
  name: string;
};

const memoryStore = () => {
  const g = globalThis as unknown as { __cipherUploadStore?: Map<string, StoredBlobMeta> };
  if (!g.__cipherUploadStore) g.__cipherUploadStore = new Map();
  return g.__cipherUploadStore;
};

export async function saveBlob(fileId: string, meta: StoredBlobMeta, ttlSeconds: number): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(`file:${fileId}`, JSON.stringify(meta), { EX: ttlSeconds });
  } else {
    memoryStore().set(fileId, meta);
  }
}

export async function loadBlob(fileId: string): Promise<StoredBlobMeta | null> {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get(`file:${fileId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredBlobMeta;
    } catch {
      return null;
    }
  }
  return memoryStore().get(fileId) ?? null;
}

export async function deleteBlob(fileId: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.del(`file:${fileId}`).catch(() => {});
  }
  memoryStore().delete(fileId);
}

export async function deleteBlobs(fileIds: Iterable<string>): Promise<void> {
  for (const id of fileIds) {
    await deleteBlob(id);
  }
}
