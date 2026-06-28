import { formatDayLabel, getDayDividerLabel, isSameCalendarDay } from "./date"

// fixed reference "now" so today/yesterday labels are deterministic
const now = new Date(2026, 5, 28, 14, 30) // 2026-06-28, mid-year

describe("isSameCalendarDay", () => {
  it("treats different times on the same day as equal", () => {
    const a = new Date(2026, 5, 28, 0, 1)
    const b = new Date(2026, 5, 28, 23, 59)
    expect(isSameCalendarDay(a, b)).toBe(true)
  })

  it("treats consecutive days as different", () => {
    const a = new Date(2026, 5, 28, 23, 59)
    const b = new Date(2026, 5, 29, 0, 1)
    expect(isSameCalendarDay(a, b)).toBe(false)
  })

  it("does not collapse the same day across years", () => {
    const a = new Date(2025, 5, 28)
    const b = new Date(2026, 5, 28)
    expect(isSameCalendarDay(a, b)).toBe(false)
  })
})

describe("formatDayLabel", () => {
  it("labels the current day 'today'", () => {
    expect(formatDayLabel(new Date(2026, 5, 28, 9, 0), now)).toBe("today")
  })

  it("labels the prior day 'yesterday'", () => {
    expect(formatDayLabel(new Date(2026, 5, 27, 9, 0), now)).toBe("yesterday")
  })

  it("labels an earlier day this year with long month, no year", () => {
    expect(formatDayLabel(new Date(2026, 2, 14), now)).toBe("march 14")
  })

  it("labels a prior-year day with short month and year", () => {
    expect(formatDayLabel(new Date(2025, 2, 14), now)).toBe("mar 14, 2025")
  })

  it("returns a lowercase label", () => {
    const label = formatDayLabel(new Date(2026, 0, 1), now)
    expect(label).toBe(label.toLowerCase())
  })

  it("handles a month boundary as yesterday", () => {
    const monthStart = new Date(2026, 6, 1, 8, 0)
    expect(formatDayLabel(new Date(2026, 5, 30, 8, 0), monthStart)).toBe(
      "yesterday",
    )
  })
})

describe("getDayDividerLabel", () => {
  it("returns null for the first message (no previous date)", () => {
    expect(getDayDividerLabel(new Date(2026, 5, 28), undefined, now)).toBeNull()
  })

  it("returns null between two same-day messages", () => {
    const prev = new Date(2026, 5, 28, 9, 0)
    const curr = new Date(2026, 5, 28, 18, 0)
    expect(getDayDividerLabel(curr, prev, now)).toBeNull()
  })

  it("returns a label when the day changes", () => {
    const prev = new Date(2026, 5, 27, 23, 0)
    const curr = new Date(2026, 5, 28, 1, 0)
    expect(getDayDividerLabel(curr, prev, now)).toBe("today")
  })

  it("labels an older boundary with its date", () => {
    const prev = new Date(2026, 2, 13, 23, 0)
    const curr = new Date(2026, 2, 14, 1, 0)
    expect(getDayDividerLabel(curr, prev, now)).toBe("march 14")
  })
})
