import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

export async function getRedis(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    try {
      const c = createClient({ url });
      c.on('error', () => {
        /* Avoid logging secrets; connection issues surface at call sites */
      });
      await c.connect();
      client = c;
    } catch {
      client = null;
      return null;
    }
  }
  return client;
}
