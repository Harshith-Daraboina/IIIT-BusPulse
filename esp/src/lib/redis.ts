import { Redis } from '@upstash/redis';
import { HttpError } from './http';
let client: Redis | undefined;
export function redis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
    throw new HttpError(503, 'Live tracking is not configured.');
  return (client ??= Redis.fromEnv());
}

export async function rateLimit(key: string, limit: number, seconds: number) {
  const count = Number(
    await redis().eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      [`limit:${key}`],
      [seconds],
    ),
  );
  if (count > limit) throw new HttpError(429, 'Too many requests. Try again shortly.');
}

export async function withBusLock<T>(busId: string, callback: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  const key = `lock:bus:${busId}`;
  const acquired = await redis().set(key, token, { nx: true, ex: 30 });
  if (!acquired) throw new HttpError(409, 'Bus update in progress. Retry shortly.');
  try {
    return await callback();
  } finally {
    await redis().eval(
      "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",
      [key],
      [token],
    );
  }
}
