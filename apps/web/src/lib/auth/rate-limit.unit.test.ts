import { beforeEach, describe, expect, it } from "bun:test"

import { __resetRateLimits, rateLimit } from "~/lib/auth/rate-limit"

beforeEach(() => __resetRateLimits())

describe("rateLimit", () => {
  it("allows the first `max` hits and denies the (max+1)th", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000)).toBe(true)
    }
    expect(rateLimit("k", 3, 60_000)).toBe(false)
  })

  it("distinct keys are independent", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000)
    // "a" is exhausted; "b" should still be allowed
    expect(rateLimit("b", 3, 60_000)).toBe(true)
  })

  it("__resetRateLimits clears all buckets", () => {
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 60_000)
    expect(rateLimit("k", 3, 60_000)).toBe(false)
    __resetRateLimits()
    expect(rateLimit("k", 3, 60_000)).toBe(true)
  })
})
