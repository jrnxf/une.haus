import { describe, expect, it } from "bun:test"

import {
  DAILY_BUDGET_MICROUSD,
  costMicrousd,
  percentUsed,
} from "~/lib/ask/cost"

describe("costMicrousd", () => {
  it("prices each kind of token", () => {
    expect(
      costMicrousd({ input: 1000, cacheWrite: 0, cacheRead: 0, output: 0 }),
    ).toBe(2000)
    expect(
      costMicrousd({ input: 0, cacheWrite: 1000, cacheRead: 0, output: 0 }),
    ).toBe(2500)
    expect(
      costMicrousd({ input: 0, cacheWrite: 0, cacheRead: 1000, output: 0 }),
    ).toBe(100)
    expect(
      costMicrousd({ input: 0, cacheWrite: 0, cacheRead: 0, output: 1000 }),
    ).toBe(10_000)
  })

  it("rounds a fraction up", () => {
    expect(
      costMicrousd({ input: 0, cacheWrite: 0, cacheRead: 1, output: 0 }),
    ).toBe(1)
  })

  it("matches a measured question of about one cent", () => {
    // A typical turn: a cached prompt, a short thread and a short answer.
    const cost = costMicrousd({
      input: 300,
      cacheWrite: 1500,
      cacheRead: 9000,
      output: 400,
    })
    expect(cost).toBe(9250)
  })
})

describe("percentUsed", () => {
  it("rounds down, so 100 only means out", () => {
    expect(percentUsed(0)).toBe(0)
    expect(percentUsed(DAILY_BUDGET_MICROUSD / 2)).toBe(50)
    expect(percentUsed(DAILY_BUDGET_MICROUSD - 1)).toBe(99)
    expect(percentUsed(DAILY_BUDGET_MICROUSD)).toBe(100)
  })

  it("stops at 100 when the last turn went over", () => {
    expect(percentUsed(DAILY_BUDGET_MICROUSD * 2)).toBe(100)
  })
})
