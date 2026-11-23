import "@tanstack/react-start/server-only"
import { env } from "~/lib/env"
import { type InsightsInput } from "~/lib/insights/schemas"
import {
  countSlow,
  errorRate,
  fillDaily,
  groupSpeed,
  lastDays,
  microsToMs,
  shapeReferrers,
} from "~/lib/traffic/shape"

// Reads for /admin/traffic. The numbers come from Cloudflare's GraphQL
// Analytics API, not from our database: Web Analytics (a beacon in the
// browser), the worker's own metrics, and the D1 metrics.
// https://developers.cloudflare.com/analytics/graphql-api/

const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql"
const SITE_HOST = "une.haus"
const WORKER_NAME = "unehaus"
// The production database, as in wrangler.jsonc.
const DATABASE_ID = "65de246d-e126-41e9-854c-f7a848c432c1"
// Cloudflare refuses a range wider than 4 weeks and 4 days on this plan.
const MAX_DAYS = 31

const QUERY = /* GraphQL */ `
  query Traffic($account: string!, $from: Date!, $to: Date!, $host: string!, $worker: string!, $database: string!) {
    viewer {
      accounts(filter: { accountTag: $account }) {
        total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { requestHost: $host, date_geq: $from, date_leq: $to, bot: 0 }) {
          count
          sum { visits }
        }
        daily: rumPageloadEventsAdaptiveGroups(limit: 100, filter: { requestHost: $host, date_geq: $from, date_leq: $to, bot: 0 }, orderBy: [date_ASC]) {
          count
          sum { visits }
          dimensions { date }
        }
        referrers: rumPageloadEventsAdaptiveGroups(limit: 12, filter: { requestHost: $host, date_geq: $from, date_leq: $to, bot: 0 }, orderBy: [sum_visits_DESC]) {
          sum { visits }
          dimensions { refererHost }
        }
        countries: rumPageloadEventsAdaptiveGroups(limit: 6, filter: { requestHost: $host, date_geq: $from, date_leq: $to, bot: 0 }, orderBy: [sum_visits_DESC]) {
          sum { visits }
          dimensions { countryName }
        }
        devices: rumPageloadEventsAdaptiveGroups(limit: 4, filter: { requestHost: $host, date_geq: $from, date_leq: $to, bot: 0 }, orderBy: [sum_visits_DESC]) {
          sum { visits }
          dimensions { deviceType }
        }
        browsers: rumPageloadEventsAdaptiveGroups(limit: 6, filter: { requestHost: $host, date_geq: $from, date_leq: $to, bot: 0 }, orderBy: [sum_visits_DESC]) {
          sum { visits }
          dimensions { userAgentBrowser }
        }
        vitals: rumWebVitalsEventsAdaptiveGroups(limit: 300, filter: { requestHost: $host, date_geq: $from, date_leq: $to }, orderBy: [count_DESC]) {
          count
          quantiles { largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 }
          dimensions { requestPath }
        }
        worker: workersInvocationsAdaptive(limit: 1, filter: { scriptName: $worker, date_geq: $from, date_leq: $to }) {
          sum { requests }
          quantiles { cpuTimeP50 cpuTimeP99 }
        }
        results: workersInvocationsAdaptive(limit: 20, filter: { scriptName: $worker, date_geq: $from, date_leq: $to }) {
          sum { requests }
          dimensions { status }
        }
        database: d1AnalyticsAdaptiveGroups(limit: 1, filter: { databaseId: $database, date_geq: $from, date_leq: $to }) {
          sum { readQueries writeQueries rowsRead rowsWritten }
        }
      }
    }
  }
`

type Visits = { sum: { visits: number } }

type Account = {
  total: (Visits & { count: number })[]
  daily: (Visits & { count: number; dimensions: { date: string } })[]
  referrers: (Visits & { dimensions: { refererHost: string } })[]
  countries: (Visits & { dimensions: { countryName: string } })[]
  devices: (Visits & { dimensions: { deviceType: string } })[]
  browsers: (Visits & { dimensions: { userAgentBrowser: string } })[]
  vitals: {
    count: number
    quantiles: {
      largestContentfulPaintP75: number
      interactionToNextPaintP75: number
      cumulativeLayoutShiftP75: number
    }
    dimensions: { requestPath: string }
  }[]
  worker: {
    sum: { requests: number }
    quantiles: { cpuTimeP50: number; cpuTimeP99: number }
  }[]
  results: { sum: { requests: number }; dimensions: { status: string } }[]
  database: {
    sum: {
      readQueries: number
      writeQueries: number
      rowsRead: number
      rowsWritten: number
    }
  }[]
}

type Response = {
  data: { viewer: { accounts: Account[] } } | null
  errors: { message: string }[] | null
}

function bars<T extends Visits>(rows: T[], label: (row: T) => string) {
  return rows
    .filter((row) => row.sum.visits > 0)
    .map((row) => ({ label: label(row), value: row.sum.visits }))
}

export async function getTraffic({ days }: InsightsInput) {
  const token = env.CLOUDFLARE_ANALYTICS_API_TOKEN
  if (!token) {
    return { status: "off" as const }
  }

  const range = lastDays(Math.min(days, MAX_DAYS), new Date())
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        account: env.CLOUDFLARE_ACCOUNT_ID,
        from: range[0],
        to: range.at(-1),
        host: SITE_HOST,
        worker: WORKER_NAME,
        database: DATABASE_ID,
      },
    }),
  })

  const body = (await response.json().catch(() => null)) as Response | null
  const account = body?.data?.viewer.accounts[0]
  if (!response.ok || !account) {
    // Cloudflare's message names the cause, such as a range that is too
    // long for the plan. It holds no secret.
    const message =
      body?.errors?.[0]?.message ?? `cloudflare answered ${response.status}`
    return { status: "error" as const, message }
  }

  const speed = groupSpeed(
    account.vitals.map((row) => ({
      path: row.dimensions.requestPath,
      samples: row.count,
      lcpMicros: row.quantiles.largestContentfulPaintP75,
      inpMicros: row.quantiles.interactionToNextPaintP75,
      cls: row.quantiles.cumulativeLayoutShiftP75,
    })),
  )
  const results = account.results
    .map((row) => ({
      status: row.dimensions.status,
      requests: row.sum.requests,
    }))
    .toSorted((a, b) => b.requests - a.requests)
  const referrers = shapeReferrers(
    account.referrers.map((row) => ({
      host: row.dimensions.refererHost,
      visits: row.sum.visits,
    })),
    SITE_HOST,
  )
  const database = account.database[0]?.sum

  return {
    status: "ok" as const,
    // Fewer than the days asked for when the range is over the limit.
    days: range.length,
    totals: {
      visits: account.total[0]?.sum.visits ?? 0,
      pageViews: account.total[0]?.count ?? 0,
      requests: account.worker[0]?.sum.requests ?? 0,
      errorRate: errorRate(results),
      cpuP50Ms: microsToMs(account.worker[0]?.quantiles.cpuTimeP50 ?? 0),
      cpuP99Ms: microsToMs(account.worker[0]?.quantiles.cpuTimeP99 ?? 0),
      dbQueries: (database?.readQueries ?? 0) + (database?.writeQueries ?? 0),
      rowsRead: database?.rowsRead ?? 0,
      rowsWritten: database?.rowsWritten ?? 0,
      slowPages: countSlow(speed),
      topReferrer:
        referrers.find((row) => row.label !== "direct")?.label ?? null,
    },
    daily: fillDaily(
      account.daily.map((row) => ({
        day: row.dimensions.date,
        visits: row.sum.visits,
        pageViews: row.count,
      })),
      range,
    ),
    referrers,
    countries: bars(account.countries, (row) => row.dimensions.countryName),
    devices: bars(account.devices, (row) => row.dimensions.deviceType),
    browsers: bars(account.browsers, (row) => row.dimensions.userAgentBrowser),
    speed,
    results,
  }
}
