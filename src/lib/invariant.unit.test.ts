import { describe, expect, it, mock } from "bun:test"

import { invariant } from "./invariant"

// Mock the @tanstack/react-router module for assertFound
mock.module("@tanstack/react-router", () => ({
  notFound: () => {
    const error = new Error("Not Found")
    ;(error as Error & { isNotFound: boolean }).isNotFound = true
    return error
  },
}))

describe("invariant", () => {
  it("does not throw when condition is truthy", () => {
    expect(() => invariant(true)).not.toThrow()
    expect(() => invariant(1)).not.toThrow()
    expect(() => invariant("hello")).not.toThrow()
    expect(() => invariant({})).not.toThrow()
  })

  it.each([false, null, undefined, 0, ""])(
    "throws for falsy value: %p",
    (value) => {
      expect(() => invariant(value)).toThrow("Invariant failed")
    },
  )

  it("throws with custom message", () => {
    expect(() => invariant(false, "Custom error message")).toThrow(
      "Custom error message",
    )
  })

  it("works as type assertion", () => {
    const value: string | null = "hello"
    invariant(value)
    const length: number = value.length
    expect(length).toBe(5)
  })
})

describe("assertFound", () => {
  it("does not throw when condition is truthy", async () => {
    const { assertFound } = await import("./invariant")
    expect(() => assertFound(true)).not.toThrow()
    expect(() => assertFound({})).not.toThrow()
  })

  it("throws notFound error when condition is falsy", async () => {
    const { assertFound } = await import("./invariant")
    expect(() => assertFound(null)).toThrow("Not Found")
    expect(() => assertFound(undefined)).toThrow("Not Found")
    expect(() => assertFound(false)).toThrow("Not Found")
  })
})
