import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisClient: Redis | null = null;
const inMemoryCache = new Map<string, { val: string; expiry: number }>();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 2 ? null : 1000),
    lazyConnect: true
  });

  redisClient.connect().then(() => {
    console.log('[REDIS] Connected to Redis');
  }).catch(() => {
    console.log('[REDIS] Using In-Memory Cache fallback');
    redisClient = null;
  });
} catch {
  redisClient = null;
}

export const Cache = {
  async get(key: string): Promise<string | null> {
    if (redisClient && redisClient.status === 'ready') {
      try { return await redisClient.get(key); } catch {}
    }
    const item = inMemoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      inMemoryCache.delete(key);
      return null;
    }
    return item.val;
  },

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {}
    }
    inMemoryCache.set(key, { val: value, expiry: Date.now() + ttlSeconds * 1000 });
  },

  async del(key: string): Promise<void> {
    if (redisClient && redisClient.status === 'ready') {
      try { await redisClient.del(key); } catch {}
    }
    inMemoryCache.delete(key);
  }
};
