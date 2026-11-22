import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"

import { db } from "~/db"
import { askEvents, dailyActivity, dailyPageViews } from "~/db/schema"
import { type AskError, type AskSource } from "~/lib/ask/schemas"
import {
  featureOfRoute,
  insightsDay,
  isTrackedRoute,
} from "~/lib/insights/features"

// Writes for admin insights. Each one is a single upsert that adds to a
// count, so concurrent requests never lose a count.

function addActivity(
  userId: number,
  feature: string,
  { views = 0, actions = 0 },
  day: string,
) {
  return db
    .insert(dailyActivity)
    .values({ day, userId, feature, views, actions })
    .onConflictDoUpdate({
      target: [dailyActivity.day, dailyActivity.userId, dailyActivity.feature],
      set: {
        views: sql`${dailyActivity.views} + ${views}`,
        actions: sql`${dailyActivity.actions} + ${actions}`,
      },
    })
}

// One page view. A guest view (no userId) counts only toward the page.
export async function recordView(
  route: string,
  userId: number | null,
  now = Date.now(),
) {
  if (!isTrackedRoute(route)) return
  const day = insightsDay(now)
  const page = db
    .insert(dailyPageViews)
    .values({ day, route, views: 1 })
    .onConflictDoUpdate({
      target: [dailyPageViews.day, dailyPageViews.route],
      set: { views: sql`${dailyPageViews.views} + 1` },
    })
  const feature = featureOfRoute(route)
  if (userId === null || feature === null) {
    await page
    return
  }
  await db.batch([page, addActivity(userId, feature, { views: 1 }, day)])
}

// One write by a member, such as a like or a new post.
export async function recordAction(
  userId: number,
  feature: string,
  now = Date.now(),
) {
  await addActivity(userId, feature, { actions: 1 }, insightsDay(now))
}

export type AskRecord = {
  userId: number
  source: AskSource
  tools: string[]
  turns: number
  costMicrousd: number
  error: AskError | null
}

// One ask question. It also counts as an "ask" action for the member.
// Never pass question or answer text here: the table has no place for it.
export async function recordAsk(record: AskRecord, now = Date.now()) {
  const day = insightsDay(now)
  await db.batch([
    db.insert(askEvents).values({ ...record, day, createdAt: new Date(now) }),
    addActivity(record.userId, "ask", { actions: 1 }, day),
  ])
}
