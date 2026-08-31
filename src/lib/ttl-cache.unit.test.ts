import { describe, expect, it } from "bun:test"

import { ttlCache } from "./ttl-cache"

describe("ttlCache", () => {
  it("does not re-invoke fn on a second call within the TTL", async () => {
    let calls = 0
    const cache = ttlCache(async () => {
      calls++
      return calls
    }, 1000)

    const first = await cache.get()
    const second = await cache.get()

    expect(first).toBe(1)
    expect(second).toBe(1)
    expect(calls).toBe(1)
  })

  it("re-invokes fn after the TTL expires", async () => {
    let calls = 0
    const cache = ttlCache(async () => {
      calls++
      return calls
    }, 5)

    expect(await cache.get()).toBe(1)
    await new Promise((r) => setTimeout(r, 10))
    expect(await cache.get()).toBe(2)
    expect(calls).toBe(2)
  })

  it("collapses two concurrent cold calls into a single fn invocation", async () => {
    let calls = 0
    const cache = ttlCache(async () => {
      calls++
      return calls
    }, 1000)

    const [first, second] = await Promise.all([cache.get(), cache.get()])

    expect(first).toBe(1)
    expect(second).toBe(1)
    expect(calls).toBe(1)
  })

  it("does not cache a rejected fn", async () => {
    let calls = 0
    const cache = ttlCache(async () => {
      calls++
      if (calls === 1) {
        throw new Error("boom")
      }
      return calls
    }, 1000)

    await expect(cache.get()).rejects.toThrow("boom")
    expect(await cache.get()).toBe(2)
    expect(calls).toBe(2)
  })

  it("forces re-invocation after clear()", async () => {
    let calls = 0
    const cache = ttlCache(async () => {
      calls++
      return calls
    }, 1000)

    expect(await cache.get()).toBe(1)
    cache.clear()
    expect(await cache.get()).toBe(2)
    expect(calls).toBe(2)
  })
})
