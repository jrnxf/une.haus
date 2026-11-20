import { DAILY_BUDGET_MICROUSD } from "~/lib/ask/cost"
import { addToWindow, windowTotal } from "~/lib/auth/rate-limit"

// The site owner asks without a daily limit.
const OWNER_USER_ID = 1
const DAY_MS = 24 * 60 * 60 * 1000

const key = (userId: number) => `ask-spend:${userId}`

// A member's ask spend in a fixed 24-hour window that starts at their first
// question. The window lives in rate_limits, so every Workers isolate sees
// it. Null for the owner, who has no limit.
export function askBudget(userId: number) {
  if (userId === OWNER_USER_ID) return null
  return {
    // Millionths of a dollar spent in the current window.
    spent: (now?: number) => windowTotal(key(userId), now),
    // Adds the cost of one model turn and returns the new total.
    charge: (microusd: number, now?: number) =>
      addToWindow(key(userId), microusd, DAY_MS, now),
    limit: DAILY_BUDGET_MICROUSD,
  }
}

export type AskBudget = NonNullable<ReturnType<typeof askBudget>>
