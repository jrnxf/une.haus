// Pure helpers that turn Cloudflare analytics rows into what the admin
// traffic page shows. No network and no env here, so they are easy to test.

export type Rating = "good" | "ok" | "poor"

// Google's Core Web Vitals thresholds, at the 75th percentile:
// https://web.dev/articles/vitals
const THRESHOLDS = {
  lcpMs: [2500, 4000],
  inpMs: [200, 500],
  cls: [0.1, 0.25],
} as const

export type Vital = keyof typeof THRESHOLDS

export function rateVital(vital: Vital, value: number): Rating {
  const [good, ok] = THRESHOLDS[vital]
  if (value <= good) return "good"
  return value <= ok ? "ok" : "poor"
}

/** Cloudflare reports times in microseconds. */
export function microsToMs(micros: number) {
  return Math.round(micros / 1000)
}

/**
 * The kind of page a real path belongs to. A segment of digits is an id,
 * so `/posts/123` and `/posts/456` are both `/posts/$id`.
 */
export function routeOfPath(path: string) {
  const route = path
    .split("/")
    .map((segment) => (/^\d+$/.test(segment) ? "$id" : segment))
    .join("/")
  return route.length > 1 ? route.replace(/\/$/, "") : route
}

export type SpeedRow = {
  route: string
  samples: number
  // Null when Cloudflare has no measure of this vital for the page.
  lcpMs: number | null
  inpMs: number | null
  cls: number | null
}

type VitalsInput = {
  path: string
  samples: number
  lcpMicros: number
  inpMicros: number
  cls: number
}

type Mean = { total: number; weight: number }

function add(mean: Mean, value: number, weight: number, valid: boolean) {
  if (!valid) return
  mean.total += value * weight
  mean.weight += weight
}

function result(mean: Mean) {
  return mean.weight > 0 ? mean.total / mean.weight : null
}

/**
 * One row per kind of page, slowest first. Cloudflare gives a 75th
 * percentile per real path. Paths of one kind are joined by a mean that
 * weights each path by its samples, which is close but not exact.
 *
 * Cloudflare reports a vital it could not measure as a negative number,
 * and a paint it could not measure as zero. Those do not count.
 */
export function groupSpeed(rows: VitalsInput[], limit = 12): SpeedRow[] {
  const groups = new Map<
    string,
    { samples: number; lcp: Mean; inp: Mean; cls: Mean }
  >()
  for (const row of rows) {
    if (row.samples <= 0) continue
    const route = routeOfPath(row.path)
    const group = groups.get(route) ?? {
      samples: 0,
      lcp: { total: 0, weight: 0 },
      inp: { total: 0, weight: 0 },
      cls: { total: 0, weight: 0 },
    }
    group.samples += row.samples
    add(group.lcp, row.lcpMicros, row.samples, row.lcpMicros > 0)
    add(group.inp, row.inpMicros, row.samples, row.inpMicros >= 0)
    add(group.cls, row.cls, row.samples, row.cls >= 0)
    groups.set(route, group)
  }

  return (
    [...groups.entries()]
      .map(([route, g]) => {
        const lcp = result(g.lcp)
        const inp = result(g.inp)
        const cls = result(g.cls)
        return {
          route,
          samples: g.samples,
          lcpMs: lcp === null ? null : microsToMs(lcp),
          inpMs: inp === null ? null : microsToMs(inp),
          cls: cls === null ? null : Math.round(cls * 100) / 100,
        }
      })
      // A page with no measure at all says nothing.
      .filter(
        (row) => row.lcpMs !== null || row.inpMs !== null || row.cls !== null,
      )
      .toSorted(
        (a, b) => (b.lcpMs ?? -1) - (a.lcpMs ?? -1) || b.samples - a.samples,
      )
      .slice(0, limit)
  )
}

function isSlow(vital: Vital, value: number | null) {
  return value !== null && rateVital(vital, value) !== "good"
}

/** How many kinds of page have a vital that is not good. */
export function countSlow(rows: SpeedRow[]) {
  return rows.filter(
    (row) =>
      isSlow("lcpMs", row.lcpMs) ||
      isSlow("inpMs", row.inpMs) ||
      isSlow("cls", row.cls),
  ).length
}

export type Bar = { label: string; value: number }

/**
 * Referrers by visits. An empty host is a direct visit. The site's own host
 * is a move inside the site, not a referrer, so it is left out.
 */
export function shapeReferrers(
  rows: { host: string; visits: number }[],
  ownHost: string,
  limit = 6,
): Bar[] {
  const visits = new Map<string, number>()
  for (const row of rows) {
    if (row.host === ownHost || row.visits <= 0) continue
    const label = referrerLabel(row.host)
    visits.set(label, (visits.get(label) ?? 0) + row.visits)
  }
  return [...visits.entries()]
    .map(([label, value]) => ({ label, value }))
    .toSorted((a, b) => b.value - a.value)
    .slice(0, limit)
}

// An Android app reports its package name as the referrer.
const APP_REFERRERS: Record<string, string> = {
  "com.google.android.googlequicksearchbox": "google app",
  "com.google.android.gm": "gmail app",
}

function referrerLabel(host: string) {
  if (host === "") return "direct"
  return APP_REFERRERS[host] ?? host.replace(/^www\./, "")
}

/** The last `days` UTC days, oldest first, as YYYY-MM-DD. */
export function lastDays(days: number, now: Date) {
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now.getTime() - (days - 1 - index) * 86_400_000)
    return day.toISOString().slice(0, 10)
  })
}

/** One row per day of the range. A day with no data counts as zero. */
export function fillDaily(
  rows: { day: string; visits: number; pageViews: number }[],
  days: string[],
) {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  return days.map((day) => byDay.get(day) ?? { day, visits: 0, pageViews: 0 })
}

// A worker request with one of these results did not fail on our side.
const FINE_RESULTS = new Set(["success", "clientDisconnected"])

/** The share of worker requests that failed, as a percent with one decimal. */
export function errorRate(rows: { status: string; requests: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.requests, 0)
  if (total === 0) return 0
  const failed = rows
    .filter((row) => !FINE_RESULTS.has(row.status))
    .reduce((sum, row) => sum + row.requests, 0)
  return Math.round((failed / total) * 1000) / 10
}

/** 1234 -> "1,234", 61234 -> "61.2k", 3646346441 -> "3.6B". */
export function formatCount(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("en-US")
}

/** 848 -> "0.8 s", 96 -> "96 ms". */
export function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
}
