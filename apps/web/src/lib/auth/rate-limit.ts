// Ephemeral, in-memory — lost on restart by design (single-process deploy).
// Mirrors the in-memory pattern in ~/lib/presence/state.ts.
type Hit = { count: number; resetAt: number }
const buckets = new Map<string, Hit>()

/**
 * Returns true if the action is allowed, false if the limit is exceeded.
 * Counts hits per `key` within a rolling `windowMs`; allows up to `max`.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  return true
}

// Exposed for tests to reset state between cases.
export function __resetRateLimits() {
  buckets.clear()
}
