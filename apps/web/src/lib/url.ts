import { defaultStringifySearch } from "@tanstack/react-router"

/**
 * Custom search param stringifier.
 *
 * Output must be byte-identical to `URLSearchParams.toString()` of itself:
 * TanStack Start normalizes every incoming request URL through URLSearchParams
 * before the router compares it against the stringified canonical URL, and any
 * difference makes SSR respond with a 307 to the "canonical" URL. If the two
 * encodings disagree (e.g. a prettified `,` vs `%2C`), that redirect never
 * converges and every direct page load becomes an infinite redirect loop.
 * So: no decoding of `%2C`/`%7E`/`%2F` for readability — the canonical
 * encoding is the only stable one.
 */
export function stringifySearch(search: Record<string, unknown>): string {
  // Flatten string arrays into comma-separated values so URLs read
  // ?tags=flatland%2Cstreet instead of ?tags=%5B"flatland","street"%5D and
  // parse back through the commaArrayOf schemas.
  const flattened: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(search)) {
    if (
      Array.isArray(value) &&
      value.every((v) => typeof v === "string" || typeof v === "number")
    ) {
      flattened[key] = value.join(",")
    } else {
      flattened[key] = value
    }
  }
  return defaultStringifySearch(flattened)
}
