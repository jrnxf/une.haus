import { beforeEach, describe, expect, it } from "bun:test"

import { __resetRateLimits, rateLimit } from "~/lib/auth/rate-limit"

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
    for (let i = 0; i < 3; i++) await rateLimit("k", 3, 50)
    expect(await rateLimit("k", 3, 50)).toBe(false)
    await Bun.sleep(60)
    expect(await rateLimit("k", 3, 50)).toBe(true)
  })

  it("__resetRateLimits clears all buckets", async () => {
    for (let i = 0; i < 3; i++) await rateLimit("k", 3, 60_000)
    expect(await rateLimit("k", 3, 60_000)).toBe(false)
    await __resetRateLimits()
    expect(await rateLimit("k", 3, 60_000)).toBe(true)
  })
})
