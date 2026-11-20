import { beforeEach, describe, expect, it } from "bun:test"

import {
  __resetRateLimits,
  addToWindow,
  countHit,
  rateLimit,
  windowTotal,
} from "~/lib/auth/rate-limit"

beforeEach(() => __resetRateLimits())

describe("rateLimit", () => {
  it("allows the first `max` hits and denies the (max+1)th", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await rateLimit("k", 3, 60_000)).toBe(true)
    }
    expect(await rateLimit("k", 3, 60_000)).toBe(false)
  })

  it("distinct keys are independent", async () => {
    for (let i = 0; i < 3; i++) await rateLimit("a", 3, 60_000)
    // "a" is exhausted; "b" should still be allowed
    expect(await rateLimit("b", 3, 60_000)).toBe(true)
  })

  it("an expired window restarts the count", async () => {
    // Fixed clock: real time made this flaky on CI, where three DB round
    // trips could outlast a short window before the denial was checked.
    const t = Date.now()
    for (let i = 0; i < 3; i++) await rateLimit("k", 3, 50, t)
    expect(await rateLimit("k", 3, 50, t)).toBe(false)
    expect(await rateLimit("k", 3, 50, t + 50)).toBe(false) // boundary is inclusive
    expect(await rateLimit("k", 3, 50, t + 51)).toBe(true)
  })

  it("__resetRateLimits clears all buckets", async () => {
    for (let i = 0; i < 3; i++) await rateLimit("k", 3, 60_000)
    expect(await rateLimit("k", 3, 60_000)).toBe(false)
    await __resetRateLimits()
    expect(await rateLimit("k", 3, 60_000)).toBe(true)
  })

  it("countHit returns the hits so far and restarts with the window", async () => {
    const t = Date.now()
    expect(await countHit("q", 50, t)).toBe(1)
    expect(await countHit("q", 50, t)).toBe(2)
    expect(await countHit("q", 50, t + 51)).toBe(1)
  })
  it("addToWindow sums amounts and restarts with the window", async () => {
    const t = Date.now()
    expect(await addToWindow("s", 700, 50, t)).toBe(700)
    expect(await addToWindow("s", 300, 50, t)).toBe(1000)
    expect(await addToWindow("s", 5, 50, t + 51)).toBe(5)
  })

  it("windowTotal reads without adding, and is 0 after the window", async () => {
    const t = Date.now()
    expect(await windowTotal("s", t)).toBe(0)
    await addToWindow("s", 700, 50, t)
    expect(await windowTotal("s", t)).toBe(700)
    expect(await windowTotal("s", t)).toBe(700)
    expect(await windowTotal("s", t + 50)).toBe(700) // boundary is inclusive
    expect(await windowTotal("s", t + 51)).toBe(0)
  })
})
