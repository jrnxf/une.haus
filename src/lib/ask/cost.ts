// What one member may spend on ask per day, in millionths of a dollar.
// About 200 questions at the measured $0.01 each (see docs/ask.md).
export const DAILY_BUDGET_MICROUSD = 2_000_000

// Tokens one model turn used.
export type TurnUsage = {
  input: number
  cacheWrite: number
  cacheRead: number
  output: number
}

// Sonnet 5.5 prices in millionths of a dollar per token: $2, $2.50, $0.10
// and $10 per million. Thinking counts as output.
const PRICE = { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 }

// The cost of one model turn, rounded up to a whole millionth of a dollar.
export function costMicrousd(usage: TurnUsage) {
  return Math.ceil(
    usage.input * PRICE.input +
      usage.cacheWrite * PRICE.cacheWrite +
      usage.cacheRead * PRICE.cacheRead +
      usage.output * PRICE.output,
  )
}

// The share of today's budget spent, as a whole percent. It rounds down, so
// 100 means the member is out: the route refuses at the full budget.
export function percentUsed(spentMicrousd: number) {
  return Math.min(
    100,
    Math.floor((spentMicrousd * 100) / DAILY_BUDGET_MICROUSD),
  )
}
