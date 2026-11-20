import { and, eq, gte, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import { rateLimits } from "~/db/schema"

// Fixed-window rate limiting backed by the database. Workers isolates share
// no process memory, so counters must live where every isolate sees them.
// The whole check is one atomic upsert: expired windows restart, live windows
// increment, and the returned count decides the verdict — concurrent requests
// can never both sneak under the cap.

/**
 * Adds `amount` to `key` and returns the total so far in its fixed window of
 * `windowMs`, this amount included. The ask spend cap adds what each model
 * turn cost. `now` is injectable so tests can step the clock instead of
 * sleeping.
 */
export async function addToWindow(
  key: string,
  amount: number,
  windowMs: number,
  now = Date.now(),
): Promise<number> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: amount, resetsAt: new Date(now + windowMs) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetsAt} < ${now} THEN ${amount} ELSE ${rateLimits.count} + ${amount} END`,
        resetsAt: sql`CASE WHEN ${rateLimits.resetsAt} < ${now} THEN ${now + windowMs} ELSE ${rateLimits.resetsAt} END`,
      },
    })
    .returning({ count: rateLimits.count })

  // Opportunistic cleanup: expired windows are garbage; removing them here
  // keeps the table at the size of the currently-limited key set.
  await db.delete(rateLimits).where(lt(rateLimits.resetsAt, new Date(now)))

  return row?.count ?? amount
}

/**
 * The total for `key` in its current window, or 0 when it has none or it
 * expired. It only reads, so a check before work adds nothing.
 */
export async function windowTotal(
  key: string,
  now = Date.now(),
): Promise<number> {
  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(
      and(eq(rateLimits.key, key), gte(rateLimits.resetsAt, new Date(now))),
    )
  return row?.count ?? 0
}

/**
 * Counts one hit for `key` and returns the hits so far in its fixed window of
 * `windowMs`, this one included. Use it when the caller needs the count, for
 * example to warn before the limit.
 */
export async function countHit(
  key: string,
  windowMs: number,
  now = Date.now(),
): Promise<number> {
  return addToWindow(key, 1, windowMs, now)
}

/**
 * Returns true if the action is allowed, false if the limit is exceeded.
 * Counts hits per `key` within a fixed window of `windowMs`; allows up to `max`.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  return (await countHit(key, windowMs, now)) <= max
}

// Exposed for tests to reset state between cases.
export async function __resetRateLimits() {
  await db.delete(rateLimits)
}
