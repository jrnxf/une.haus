import { beforeEach, describe, expect, it } from "bun:test"

import {
  getAskInsights,
  getMemberInsights,
  getOverview,
} from "~/lib/insights/ops.server"
import {
  recordAction,
  recordAsk,
  recordView,
} from "~/lib/insights/record.server"
import { seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

// 2026-07-10 12:00 in Portugal (UTC+1 in summer).
const NOW = Date.UTC(2026, 6, 10, 11)
const DAY = 24 * 60 * 60 * 1000

describe("insights integration", () => {
  it("adds views and actions into one row per member, day and feature", async () => {
    const rider = await seedUser({ name: "Rider" })

    await recordView("/posts/$postId", rider.id, NOW)
    await recordView("/posts", rider.id, NOW)
    await recordAction(rider.id, "posts", NOW)
    await recordView("/posts", null, NOW)

    const overview = await getOverview({ days: 7, now: NOW })
    expect(overview.totals.activeToday).toBe(1)
    expect(overview.totals.pageViews).toBe(3)
    expect(overview.features).toEqual([
      {
        feature: "posts",
        members: 1,
        views: 2,
        actions: 1,
        prevMembers: null,
        top: { id: rider.id, name: "Rider" },
      },
    ])
    expect(overview.pages).toEqual([
      { route: "/posts", views: 2 },
      { route: "/posts/$postId", views: 1 },
    ])
    expect(overview.daily).toHaveLength(7)
    expect(overview.daily.at(-1)).toEqual({
      day: "2026-07-10",
      members: 1,
      askers: 0,
    })
  })

  it("skips admin pages and keeps sign-in pages out of features", async () => {
    const rider = await seedUser({ name: "Rider" })

    await recordView("/admin/insights", rider.id, NOW)
    await recordView("/auth/verify", rider.id, NOW)

    const overview = await getOverview({ days: 7, now: NOW })
    expect(overview.pages).toEqual([{ route: "/auth/verify", views: 1 }])
    expect(overview.features).toEqual([])
    expect(overview.totals.activeToday).toBe(0)
  })

  it("compares features against the window before", async () => {
    const a = await seedUser({ name: "A" })
    const b = await seedUser({ name: "B" })

    // Two members in the window before, one in this window.
    await recordView("/vault", a.id, NOW - 9 * DAY)
    await recordView("/vault", b.id, NOW - 9 * DAY)
    await recordView("/vault", a.id, NOW)
    // Older than both windows: counts nowhere.
    await recordView("/vault", b.id, NOW - 20 * DAY)

    const overview = await getOverview({ days: 7, now: NOW })
    expect(overview.features[0]).toMatchObject({
      feature: "vault",
      members: 1,
      prevMembers: 2,
    })
  })

  it("records ask questions as numbers and counts them as ask use", async () => {
    const rider = await seedUser({ name: "Rider" })
    const other = await seedUser({ name: "Other" })

    await recordAsk(
      {
        userId: rider.id,
        source: "home",
        tools: ["get_stats", "search_tricks"],
        turns: 3,
        costMicrousd: 20_000,
        error: null,
      },
      NOW - DAY,
    )
    await recordAsk(
      {
        userId: rider.id,
        source: "ask",
        tools: ["get_stats"],
        turns: 2,
        costMicrousd: 10_000,
        error: null,
      },
      NOW,
    )
    await recordAsk(
      {
        userId: other.id,
        source: "ask",
        tools: [],
        turns: 0,
        costMicrousd: 0,
        error: "limit",
      },
      NOW,
    )

    const ask = await getAskInsights({ days: 7, now: NOW })
    expect(ask.totals).toEqual({
      questions: 3,
      askers: 2,
      spendMicrousd: 30_000,
      perQuestionMicrousd: 10_000,
      repeatAskers: 1,
      errors: 0,
      limitHits: 1,
    })
    expect(ask.perDay.slice(-2)).toEqual([
      { day: "2026-07-09", ask: 0, home: 1 },
      { day: "2026-07-10", ask: 2, home: 0 },
    ])
    expect(ask.tools).toEqual([
      { tool: "get_stats", uses: 2 },
      { tool: "search_tricks", uses: 1 },
    ])
    expect(ask.askers[0]).toMatchObject({
      id: rider.id,
      questions: 2,
      spendMicrousd: 30_000,
      peakMicrousd: 20_000,
      lastAt: NOW,
    })
    expect(ask.recent.map((r) => [r.user.name, r.tools, r.error])).toEqual([
      ["Other", 0, "limit"],
      ["Rider", 1, null],
      ["Rider", 2, null],
    ])

    const members = await getMemberInsights({ days: 7, now: NOW })
    expect(members.features).toEqual(["ask"])
    expect(members.members.map((m) => [m.name, m.daysActive, m.uses])).toEqual([
      ["Rider", 2, [2]],
      ["Other", 1, [1]],
    ])
  })

  it("gives one column per top feature in the members table", async () => {
    const rider = await seedUser({ name: "Rider" })
    const other = await seedUser({ name: "Other" })

    await recordView("/tricks", rider.id, NOW)
    await recordView("/tricks", other.id, NOW)
    await recordAction(rider.id, "likes", NOW)
    await recordAction(rider.id, "likes", NOW)

    const members = await getMemberInsights({ days: 7, now: NOW })
    expect(members.today).toBe("2026-07-10")
    expect(members.features).toEqual(["tricks", "likes"])
    const byName = Object.fromEntries(
      members.members.map((m) => [m.name, m.uses]),
    )
    expect(byName).toEqual({ Rider: [1, 2], Other: [1, 0] })
  })
})
