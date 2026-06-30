// long month + day for dates within the current year, e.g. "march 14"
const sameYearFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
})

// short month + day + year for dates in a prior year, e.g. "mar 14, 2026"
const priorYearFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/** True when both dates fall on the same calendar day in local time. */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Lowercase day-boundary label for a message group divider: "today",
 * "yesterday", or the formatted date ("march 14" this year, "mar 14, 2026"
 * otherwise).
 */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  if (isSameCalendarDay(date, now)) return "today"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameCalendarDay(date, yesterday)) return "yesterday"

  const format =
    date.getFullYear() === now.getFullYear() ? sameYearFormat : priorYearFormat
  return format.format(date).toLowerCase()
}

/**
 * Label for a day-divider rendered before `date`, or null when no divider
 * belongs there. Returns null for the first message (no leading divider) and
 * for messages on the same calendar day as the previous one.
 */
export function getDayDividerLabel(
  date: Date,
  prevDate: Date | undefined,
  now: Date = new Date(),
): string | null {
  if (!prevDate) return null
  if (isSameCalendarDay(date, prevDate)) return null
  return formatDayLabel(date, now)
}
