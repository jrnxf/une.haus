import { describe, expect, it } from "bun:test"

import {
  featureOfRoute,
  featureOfServerFn,
  insightsDay,
  isRoutePattern,
  isTrackedRoute,
  lastDays,
} from "~/lib/insights/features"
import {
  daysBetween,
  formatDay,
  formatLastSeen,
  formatMoment,
  formatUsd,
  percentChange,
} from "~/lib/insights/format"

describe("insightsDay", () => {
  it("uses Portugal time, so 23:30 UTC in summer is the next day", () => {
    // Lisbon is UTC+1 in July.
    expect(insightsDay(Date.UTC(2026, 6, 10, 23, 30))).toBe("2026-07-11")
  })

  it("matches UTC in winter", () => {
    expect(insightsDay(Date.UTC(2026, 11, 31, 23, 30))).toBe("2026-12-31")
  })
})

describe("lastDays", () => {
  it("lists the days oldest first, today last", () => {
    expect(lastDays(3, "2026-03-01")).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ])
  })

  it("crosses the daylight saving change without a gap", () => {
    expect(lastDays(2, "2026-03-30")).toEqual(["2026-03-29", "2026-03-30"])
  })
})

describe("isRoutePattern", () => {
  it("accepts router patterns", () => {
    expect(isRoutePattern("/")).toBe(true)
    expect(isRoutePattern("/vault/$videoId")).toBe(true)
    expect(isRoutePattern("/games/rius/sets/$setId")).toBe(true)
  })

  it("rejects urls, queries and other text", () => {
    expect(isRoutePattern("https://example.com/")).toBe(false)
    expect(isRoutePattern("/posts?q=secret")).toBe(false)
    expect(isRoutePattern("/users/name with spaces")).toBe(false)
    expect(isRoutePattern(`/${"a".repeat(101)}`)).toBe(false)
    expect(isRoutePattern(42)).toBe(false)
  })
})

describe("isTrackedRoute", () => {
  it("skips admin pages", () => {
    expect(isTrackedRoute("/admin")).toBe(false)
    expect(isTrackedRoute("/admin/insights/ask")).toBe(false)
    expect(isTrackedRoute("/administrators")).toBe(true)
    expect(isTrackedRoute("/posts")).toBe(true)
  })
})

describe("featureOfRoute", () => {
  it("names the home page", () => {
    expect(featureOfRoute("/")).toBe("home")
  })

  it("uses the first segment", () => {
    expect(featureOfRoute("/vault/$videoId")).toBe("vault")
    expect(featureOfRoute("/ask")).toBe("ask")
  })

  it("names the game for game pages", () => {
    expect(featureOfRoute("/games/rius/sets/$setId")).toBe("rius")
    expect(featureOfRoute("/games")).toBe("games")
  })

  it("does not count sign-in pages as a feature", () => {
    expect(featureOfRoute("/auth/verify")).toBeNull()
  })
})

describe("featureOfServerFn", () => {
  it("maps folders to features", () => {
    expect(featureOfServerFn("src/lib/reactions/fns.ts")).toBe("likes")
    expect(featureOfServerFn("src/lib/utv/fns.ts")).toBe("vault")
    expect(featureOfServerFn("src/lib/posts/fns.ts")).toBe("posts")
    expect(featureOfServerFn("/abs/path/src/lib/gelato/fns.ts")).toBe("shop")
  })

  it("names the game for game folders", () => {
    expect(featureOfServerFn("src/lib/games/bius/fns.ts")).toBe("bius")
    expect(featureOfServerFn("src/lib/games/fns.ts")).toBeNull()
  })

  it("ignores housekeeping folders", () => {
    expect(featureOfServerFn("src/lib/session/fns.ts")).toBeNull()
    expect(featureOfServerFn("src/lib/notifications/fns.ts")).toBeNull()
    expect(featureOfServerFn("src/lib/ask/fns.ts")).toBeNull()
    expect(featureOfServerFn("src/routes/api/view.ts")).toBeNull()
  })
})

describe("format", () => {
  it("formats dollars from microdollars", () => {
    expect(formatUsd(1_234_567)).toBe("$1.23")
    expect(formatUsd(17_176, 3)).toBe("$0.017")
  })

  it("formats a day without a time zone shift", () => {
    expect(formatDay("2026-11-01")).toBe("nov 1")
  })

  it("formats a moment in Portugal time", () => {
    expect(formatMoment(Date.UTC(2026, 6, 10, 13, 5))).toBe("jul 10, 14:05")
  })

  it("counts days and names the last seen day", () => {
    expect(daysBetween("2026-02-27", "2026-03-01")).toBe(2)
    expect(formatLastSeen("2026-03-01", "2026-03-01")).toBe("today")
    expect(formatLastSeen("2026-02-28", "2026-03-01")).toBe("yesterday")
    expect(formatLastSeen("2026-02-20", "2026-03-01")).toBe("9d ago")
  })

  it("gives a percent change, or null with nothing to compare", () => {
    expect(percentChange(15, 10)).toBe(50)
    expect(percentChange(5, 10)).toBe(-50)
    expect(percentChange(5, null)).toBeNull()
    expect(percentChange(5, 0)).toBeNull()
  })
})
