import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import dns from 'node:dns';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { mongooseCache?: MongooseCache };

const cache: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cache;
}

let dnsConfigured = false;

/** Prefer IPv4; optional Google/Cloudflare DNS when ISP resolver blocks Atlas SRV lookups */
function configureMongoDns(): void {
  if (dnsConfigured) return;
  dnsConfigured = true;

  dns.setDefaultResultOrder('ipv4first');

  const servers = process.env.MONGODB_DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers?.length) {
    dns.setServers(servers);
  }
}

/** Next.js route handlers may run before `server.ts` finishes bootstrapping env — merge `.env.local` here too. */
function ensureMongoEnvLoaded(): void {
  if (process.env.MONGODB_URI?.trim()) return;
  loadEnv({ path: resolve(process.cwd(), '.env.local') });
  loadEnv({ path: resolve(process.cwd(), '.env') });
}

export async function connectMongo(): Promise<typeof mongoose> {
  ensureMongoEnvLoaded();
  configureMongoDns();

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to .env.local (see .env.local.example) and restart the dev server.'
    );
  }

  if (cache.conn) return cache.conn;

  try {
    if (!cache.promise) {
      cache.promise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20_000,
        /** Helps on some Windows setups where IPv6 → Atlas is flaky */
        ...(process.env.MONGODB_FORCE_IPV4 === '1' ? { family: 4 as const } : {}),
      });
    }
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (err) {
    cache.conn = null;
    cache.promise = null;
    throw err;
  }
}
