import { beforeAll, describe, expect, it } from "bun:test"

import { signUnsubscribe, verifyUnsubscribe } from "./unsubscribe-token"

// env validation is skipped when BUN_ENV=test; set the secret before calling
beforeAll(() => {
  process.env["SESSION_SECRET"] = "test-secret-for-unit-tests"
})

describe("signUnsubscribe / verifyUnsubscribe", () => {
  it("round-trips: valid token verifies", () => {
    const token = signUnsubscribe(1, "all")
    expect(verifyUnsubscribe(1, "all", token)).toBe(true)
  })

  it("round-trips for each type", () => {
    expect(verifyUnsubscribe(42, "digest", signUnsubscribe(42, "digest"))).toBe(
      true,
    )
    expect(
      verifyUnsubscribe(42, "game_start", signUnsubscribe(42, "game_start")),
    ).toBe(true)
    expect(verifyUnsubscribe(42, "all", signUnsubscribe(42, "all"))).toBe(true)
  })

  it("rejects wrong userId", () => {
    const token = signUnsubscribe(1, "all")
    expect(verifyUnsubscribe(2, "all", token)).toBe(false)
  })

  it("rejects wrong type", () => {
    const token = signUnsubscribe(1, "all")
    expect(verifyUnsubscribe(1, "digest", token)).toBe(false)
  })

  it("rejects tampered token", () => {
    const token = signUnsubscribe(1, "all")
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")
    expect(verifyUnsubscribe(1, "all", tampered)).toBe(false)
  })

  it("rejects garbage token with wrong length", () => {
    expect(verifyUnsubscribe(1, "all", "short")).toBe(false)
  })

  it("rejects empty token", () => {
    expect(verifyUnsubscribe(1, "all", "")).toBe(false)
  })
})
