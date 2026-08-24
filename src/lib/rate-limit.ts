/**
 * A fixed-window counter, in memory.
 *
 * Scope, stated plainly so it isn't mistaken for more than it is: this lives
 * in one Node process and resets when the server restarts. That is enough to
 * stop someone grinding passwords against the login form on a single-instance
 * deployment, and it is *not* enough behind more than one instance — swap the
 * Map for Redis if this ever runs on two boxes.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Stop the Map from growing without bound on a long-lived process. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when `ok` is false. */
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/** Called after a successful sign-in so a legitimate user starts clean. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
