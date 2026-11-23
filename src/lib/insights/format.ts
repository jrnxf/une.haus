import { INSIGHTS_TIME_ZONE } from "~/lib/insights/features"

// Display helpers for the admin overview and ask pages. Days are YYYY-MM-DD strings in
// Portugal time, and moments are epoch milliseconds.

export function formatUsd(microusd: number, digits = 2) {
  return `$${(microusd / 1_000_000).toFixed(digits)}`
}

// "2026-11-22" -> "nov 22". The noon UTC moment is the same calendar day
// in every zone near Portugal, so the label never shifts by one.
export function formatDay(day: string) {
  return new Date(`${day}T12:00:00Z`)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .toLowerCase()
}

const momentFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: INSIGHTS_TIME_ZONE,
})

// A moment as "nov 22, 14:03" in Portugal time. Built from parts, since
// engines join the date and time with different words.
export function formatMoment(ms: number) {
  const parts = Object.fromEntries(
    momentFormat.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
  )
  return `${parts.month ?? ""} ${parts.day ?? ""}, ${parts.hour ?? ""}:${parts.minute ?? ""}`.toLowerCase()
}

// Whole days from `day` to `today`, both YYYY-MM-DD.
export function daysBetween(day: string, today: string) {
  const ms = Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

export function formatLastSeen(day: string, today: string) {
  const days = daysBetween(day, today)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  return `${days}d ago`
}

// Percent change from `previous` to `current`, or null when there is no
// earlier number to compare against.
export function percentChange(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

// One color per series, in order. Static class strings, so Tailwind sees
// every class.
const SERIES_COLORS = [
  { dot: "bg-chart-1", text: "text-chart-1", fill: "var(--chart-1)" },
  { dot: "bg-chart-2", text: "text-chart-2", fill: "var(--chart-2)" },
  { dot: "bg-chart-3", text: "text-chart-3", fill: "var(--chart-3)" },
  { dot: "bg-chart-4", text: "text-chart-4", fill: "var(--chart-4)" },
  { dot: "bg-chart-5", text: "text-chart-5", fill: "var(--chart-5)" },
] as const

export function seriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0]
}
