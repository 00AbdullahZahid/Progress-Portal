/**
 * Small in-memory sliding-window rate limiter.
 *
 * On serverless this is per-instance, so it is a best-effort defense rather
 * than a hard guarantee. Combined with async scrypt, a password length cap,
 * and session revocation it raises the cost of brute-forcing substantially.
 * If the group grows, swap this for a shared store (Redis/Upstash).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Clear a bucket after a successful login. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Opportunistic cleanup so the map can't grow without bound. */
export function sweepRateLimits() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
