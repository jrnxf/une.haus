import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"

import { db } from "~/db"
import { type AskError, type AskSource } from "~/lib/ask/schemas"
import { insightsDay, lastDays } from "~/lib/insights/features"

// Read queries for /admin/insights. Each tab looks at the last `days` days
// (Portugal time, today included) and, where it compares, at the same
// number of days before them.

type Range = { days: number; now?: number }

function windows({ days, now = Date.now() }: Range) {
  const today = insightsDay(now)
  const both = lastDays(days * 2, today)
  const current = both.slice(days)
  const previous = both.slice(0, days)
  return {
    today,
    days: current,
    from: current[0] ?? today,
    prevFrom: previous[0] ?? today,
    prevTo: previous.at(-1) ?? today,
    // Members who joined in the window. createdAt is a moment, so the
    // window starts `days` whole days ago.
    joinedSince: now - days * 24 * 60 * 60 * 1000,
  }
}

const num = (value: unknown) => Number(value ?? 0)

async function rows<T>(query: ReturnType<typeof sql>) {
  return (await db.all(query)) as T[]
}

async function one<T>(query: ReturnType<typeof sql>) {
  const [row] = await rows<T>(query)
  return row
}

export async function getOverview(range: Range) {
  const w = windows(range)
  const [totals, pages, daily, askDaily, features, topMembers, prevFeatures] =
    await Promise.all([
      one<Record<string, unknown>>(sql`
        SELECT
          (SELECT COUNT(DISTINCT user_id) FROM daily_activity WHERE day = ${w.today}) AS "activeToday",
          (SELECT COUNT(DISTINCT user_id) FROM daily_activity WHERE day >= ${w.from}) AS "activeMembers",
          (SELECT COALESCE(SUM(views), 0) FROM daily_page_views WHERE day >= ${w.from}) AS "pageViews",
          (SELECT COUNT(*) FROM ask_events WHERE day >= ${w.from}) AS "questions",
          (SELECT COALESCE(SUM(cost_microusd), 0) FROM ask_events WHERE day >= ${w.from}) AS "spendMicrousd",
          (SELECT COUNT(*) FROM users WHERE created_at >= ${w.joinedSince}) AS "newMembers"
      `),
      rows<{ route: string; views: number }>(sql`
        SELECT route, SUM(views) AS views FROM daily_page_views
        WHERE day >= ${w.from}
        GROUP BY route ORDER BY views DESC, route LIMIT 10
      `),
      rows<{ day: string; members: number }>(sql`
        SELECT day, COUNT(DISTINCT user_id) AS members FROM daily_activity
        WHERE day >= ${w.from} GROUP BY day
      `),
      rows<{ day: string; askers: number }>(sql`
        SELECT day, COUNT(DISTINCT user_id) AS askers FROM ask_events
        WHERE day >= ${w.from} GROUP BY day
      `),
      rows<{
        feature: string
        members: number
        views: number
        actions: number
      }>(sql`
        SELECT feature,
          COUNT(DISTINCT user_id) AS members,
          SUM(views) AS views,
          SUM(actions) AS actions
        FROM daily_activity WHERE day >= ${w.from}
        GROUP BY feature
        ORDER BY members DESC, actions + views DESC, feature
      `),
      // The member with the most views plus actions in each feature.
      rows<{ feature: string; userId: number; name: string }>(sql`
        SELECT feature, user_id AS "userId", name FROM (
          SELECT a.feature, a.user_id, u.name,
            ROW_NUMBER() OVER (
              PARTITION BY a.feature
              ORDER BY SUM(a.views + a.actions) DESC, a.user_id
            ) AS place
          FROM daily_activity a JOIN users u ON u.id = a.user_id
          WHERE a.day >= ${w.from}
          GROUP BY a.feature, a.user_id
        ) WHERE place = 1
      `),
      rows<{ feature: string; members: number }>(sql`
        SELECT feature, COUNT(DISTINCT user_id) AS members
        FROM daily_activity
        WHERE day >= ${w.prevFrom} AND day <= ${w.prevTo}
        GROUP BY feature
      `),
    ])

  const membersByDay = new Map(daily.map((r) => [r.day, num(r.members)]))
  const askersByDay = new Map(askDaily.map((r) => [r.day, num(r.askers)]))
  const top = new Map(topMembers.map((r) => [r.feature, r]))
  const prev = new Map(prevFeatures.map((r) => [r.feature, num(r.members)]))

  return {
    totals: {
      activeToday: num(totals?.activeToday),
      activeMembers: num(totals?.activeMembers),
      pageViews: num(totals?.pageViews),
      questions: num(totals?.questions),
      spendMicrousd: num(totals?.spendMicrousd),
      newMembers: num(totals?.newMembers),
    },
    daily: w.days.map((day) => ({
      day,
      members: membersByDay.get(day) ?? 0,
      askers: askersByDay.get(day) ?? 0,
    })),
    features: features.map((r) => {
      const leader = top.get(r.feature)
      return {
        feature: r.feature,
        members: num(r.members),
        views: num(r.views),
        actions: num(r.actions),
        // Members in the window before, or null when the feature had none.
        prevMembers: prev.get(r.feature) ?? null,
        top: leader ? { id: num(leader.userId), name: leader.name } : null,
      }
    }),
    pages: pages.map((r) => ({ route: r.route, views: num(r.views) })),
  }
}

export async function getAskInsights(range: Range) {
  const w = windows(range)
  const [totals, perDay, tools, askers, recent] = await Promise.all([
    one<Record<string, unknown>>(sql`
      SELECT
        COUNT(*) AS questions,
        COUNT(DISTINCT user_id) AS askers,
        COALESCE(SUM(cost_microusd), 0) AS "spendMicrousd",
        SUM(CASE WHEN error IS NOT NULL AND error != 'limit' THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN error = 'limit' THEN 1 ELSE 0 END) AS "limitHits",
        (SELECT COUNT(*) FROM (
          SELECT user_id FROM ask_events WHERE day >= ${w.from}
          GROUP BY user_id HAVING COUNT(DISTINCT day) >= 2
        )) AS "repeatAskers"
      FROM ask_events WHERE day >= ${w.from}
    `),
    rows<{ day: string; source: AskSource; questions: number }>(sql`
      SELECT day, source, COUNT(*) AS questions FROM ask_events
      WHERE day >= ${w.from} GROUP BY day, source
    `),
    rows<{ tool: string; uses: number }>(sql`
      SELECT t.value AS tool, COUNT(*) AS uses
      FROM ask_events e, json_each(e.tools) t
      WHERE e.day >= ${w.from}
      GROUP BY t.value ORDER BY uses DESC, tool LIMIT 8
    `),
    rows<{
      userId: number
      name: string
      avatarId: string | null
      questions: number
      spendMicrousd: number
      peakMicrousd: number
      lastAt: number
    }>(sql`
      SELECT d.user_id AS "userId", u.name, u.avatar_id AS "avatarId",
        SUM(d.questions) AS questions,
        SUM(d.spend) AS "spendMicrousd",
        MAX(d.spend) AS "peakMicrousd",
        MAX(d.last_at) AS "lastAt"
      FROM (
        SELECT user_id, day, COUNT(*) AS questions,
          SUM(cost_microusd) AS spend, MAX(created_at) AS last_at
        FROM ask_events WHERE day >= ${w.from}
        GROUP BY user_id, day
      ) d JOIN users u ON u.id = d.user_id
      GROUP BY d.user_id
      ORDER BY questions DESC, "spendMicrousd" DESC
      LIMIT 10
    `),
    rows<{
      id: number
      userId: number
      name: string
      avatarId: string | null
      createdAt: number
      source: AskSource
      tools: number
      costMicrousd: number
      error: AskError | null
    }>(sql`
      SELECT e.id, e.user_id AS "userId", u.name, u.avatar_id AS "avatarId",
        e.created_at AS "createdAt", e.source,
        json_array_length(e.tools) AS tools,
        e.cost_microusd AS "costMicrousd", e.error
      FROM ask_events e JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC, e.id DESC LIMIT 20
    `),
  ])

  const counts = new Map(
    perDay.map((r) => [`${r.day} ${r.source}`, num(r.questions)]),
  )
  const questions = num(totals?.questions)
  const spendMicrousd = num(totals?.spendMicrousd)

  return {
    totals: {
      questions,
      askers: num(totals?.askers),
      spendMicrousd,
      perQuestionMicrousd: questions
        ? Math.round(spendMicrousd / questions)
        : 0,
      repeatAskers: num(totals?.repeatAskers),
      errors: num(totals?.errors),
      limitHits: num(totals?.limitHits),
    },
    perDay: w.days.map((day) => ({
      day,
      ask: counts.get(`${day} ask`) ?? 0,
      home: counts.get(`${day} home`) ?? 0,
    })),
    tools: tools.map((r) => ({ tool: r.tool, uses: num(r.uses) })),
    askers: askers.map((r) => ({
      id: num(r.userId),
      name: r.name,
      avatarId: r.avatarId,
      questions: num(r.questions),
      spendMicrousd: num(r.spendMicrousd),
      peakMicrousd: num(r.peakMicrousd),
      lastAt: num(r.lastAt),
    })),
    recent: recent.map((r) => ({
      id: num(r.id),
      user: { id: num(r.userId), name: r.name, avatarId: r.avatarId },
      createdAt: num(r.createdAt),
      source: r.source,
      tools: num(r.tools),
      costMicrousd: num(r.costMicrousd),
      error: r.error,
    })),
  }
}

// How many feature columns the members table shows.
const MEMBER_FEATURES = 8

export async function getMemberInsights(range: Range) {
  const w = windows(range)
  const [features, cells, members] = await Promise.all([
    rows<{ feature: string }>(sql`
      SELECT feature FROM daily_activity WHERE day >= ${w.from}
      GROUP BY feature
      ORDER BY COUNT(DISTINCT user_id) DESC, SUM(views + actions) DESC, feature
      LIMIT ${MEMBER_FEATURES}
    `),
    rows<{ userId: number; feature: string; uses: number }>(sql`
      SELECT user_id AS "userId", feature, SUM(views + actions) AS uses
      FROM daily_activity WHERE day >= ${w.from}
      GROUP BY user_id, feature
    `),
    rows<{
      userId: number
      name: string
      avatarId: string | null
      daysActive: number
      lastDay: string
    }>(sql`
      SELECT a.user_id AS "userId", u.name, u.avatar_id AS "avatarId",
        COUNT(DISTINCT a.day) AS "daysActive", MAX(a.day) AS "lastDay"
      FROM daily_activity a JOIN users u ON u.id = a.user_id
      WHERE a.day >= ${w.from}
      GROUP BY a.user_id
      ORDER BY "daysActive" DESC, "lastDay" DESC, u.name
      LIMIT 100
    `),
  ])

  const columns = features.map((r) => r.feature)
  const uses = new Map(
    cells.map((r) => [`${r.userId} ${r.feature}`, num(r.uses)]),
  )

  return {
    today: w.today,
    features: columns,
    members: members.map((r) => ({
      id: num(r.userId),
      name: r.name,
      avatarId: r.avatarId,
      daysActive: num(r.daysActive),
      lastDay: r.lastDay,
      uses: columns.map(
        (feature) => uses.get(`${num(r.userId)} ${feature}`) ?? 0,
      ),
    })),
  }
}
