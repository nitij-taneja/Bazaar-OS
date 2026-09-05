type Bucket = { hits: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function enforceRateLimit(key: string, options: { max: number; windowMs: number }) {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now ? { hits: 0, resetAt: now + options.windowMs } : existing;
  bucket.hits += 1;
  buckets.set(key, bucket);
  if (bucket.hits > options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new Error(`Rate limit exceeded. Retry in approximately ${retryAfterSeconds} seconds.`);
  }
  return { remaining: options.max - bucket.hits, resetAt: bucket.resetAt };
}

export function requestIdentity(headers: Record<string, unknown> | undefined, fallback = "anonymous") {
  const forwarded = headers?.["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return typeof raw === "string" && raw.trim() ? raw.split(",")[0]!.trim() : fallback;
}

export function clearRateLimitsForTest() {
  buckets.clear();
}
