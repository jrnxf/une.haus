import { lt, sql } from "drizzle-orm"

import { db } from "~/db"
import { rateLimits } from "~/db/schema"

// Fixed-window rate limiting backed by the database. Workers isolates share
// no process memory, so counters must live where every isolate sees them.
// The whole check is one atomic upsert: expired windows restart, live windows
// increment, and the returned count decides the verdict — concurrent requests
// can never both sneak under the cap.

/**
 * Returns true if the action is allowed, false if the limit is exceeded.
 * Counts hits per `key` within a fixed window of `windowMs`; allows up to `max`.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now()

  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetsAt: new Date(now + windowMs) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetsAt} < ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetsAt: sql`CASE WHEN ${rateLimits.resetsAt} < ${now} THEN ${now + windowMs} ELSE ${rateLimits.resetsAt} END`,
      },
    })
    .returning({ count: rateLimits.count })

  // Opportunistic cleanup: expired windows are garbage; removing them here
  // keeps the table at the size of the currently-limited key set.
  await db.delete(rateLimits).where(lt(rateLimits.resetsAt, new Date(now)))

  return (row?.count ?? 1) <= max
}

// Exposed for tests to reset state between cases.
export async function __resetRateLimits() {
  await db.delete(rateLimits)
}
