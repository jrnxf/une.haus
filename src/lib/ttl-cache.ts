type CacheEntry<T> = {
  value: Promise<T>
  expiresAt: number
}

export function ttlCache<T>(fn: () => Promise<T>, ttlMs: number) {
  let entry: CacheEntry<T> | null = null

  async function get(): Promise<T> {
    const now = Date.now()
    if (entry && entry.expiresAt > now) {
      return entry.value
    }
    const value = fn().catch((error: unknown) => {
      // don't cache failures
      entry = null
      throw error
    })
    entry = { value, expiresAt: now + ttlMs }
    return value
  }

  function clear() {
    entry = null
  }

  return { get, clear }
}
