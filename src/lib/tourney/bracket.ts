import { z } from "zod"

/**
 * Base rider entry from URL - userId XOR name, never both, never neither.
 * This is the canonical format for URL serialization.
 */
export type RiderEntry =
  | {
      userId: number
      name: null
    }
  | {
      userId: null
      name: string
    }

/**
 * Resolved rider entry for display - can have both userId AND name
 * when we've looked up the user's name from their ID.
 */
export type ResolvedRiderEntry = {
  userId: number | null
  name: string | null
}

/**
 * Rider entry with orderId for drag-and-drop reordering.
 * Uses the flexible resolved type since UI components need to store
 * both userId and resolved name for display.
 */
export type OrderedRiderEntry = ResolvedRiderEntry & { orderId: string }

/** Generate a unique order ID for drag-and-drop */
export function generateOrderId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Encode a single rider for URL param
 * - userId → "329"
 * - custom name → "~John"
 *
 * Prioritizes userId over name (for resolved entries with both).
 * Returns null for invalid entries (neither userId nor name).
 */
export function encodeRider(
  rider: RiderEntry | ResolvedRiderEntry,
): string | null {
  if (rider.userId !== null) {
    return String(rider.userId)
  }
  if (rider.name !== null) {
    return `~${rider.name}`
  }
  return null
}

/**
 * Decode a single rider from URL param segment
 * Returns null for invalid entries (empty, whitespace-only, etc.)
 */
export function decodeRider(segment: string): RiderEntry | null {
  const trimmed = segment.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("~")) {
    const name = trimmed.slice(1)
    // Reject empty names
    if (!name) return null
    return { userId: null, name }
  }

  const num = Number(trimmed)
  if (!Number.isNaN(num) && Number.isInteger(num)) {
    return { userId: num, name: null }
  }

  // Invalid format - not a number and no ~ prefix
  return null
}

/**
 * Encode riders array to URL param string
 * Example: [{userId: 329}, {name: "John"}] → "329,~John"
 *
 * Filters out invalid entries (neither userId nor name).
 */
export function encodeRidersParam(
  riders: (RiderEntry | ResolvedRiderEntry)[],
): string | undefined {
  const encoded = riders.map(encodeRider).filter((s): s is string => s !== null)
  if (encoded.length === 0) return undefined
  return encoded.join(",")
}

/**
 * Parse riders URL param to array
 * Example: "329,~John,160" → [{userId: 329}, {name: "John"}, {userId: 160}]
 *
 * Note: Custom names cannot contain commas (limitation of CSV format)
 */
export function parseRidersParam(val: string | undefined): RiderEntry[] {
  if (!val) return []
  return val
    .split(",")
    .map(decodeRider)
    .filter((r): r is RiderEntry => r !== null)
}

/**
 * Parse riders URL param with orderId for setup page (drag-and-drop)
 */
export function parseRidersParamOrdered(
  val: string | undefined,
): OrderedRiderEntry[] {
  return parseRidersParam(val).map((rider) => ({
    ...rider,
    orderId: generateOrderId(),
  }))
}

/**
 * Encode ordered riders (strips orderId)
 */
export function encodeOrderedRidersParam(
  riders: OrderedRiderEntry[],
): string | undefined {
  return encodeRidersParam(riders)
}

/** Consistent string key for rider identity comparison */
export function riderKey(rider: RiderEntry | ResolvedRiderEntry): string {
  if (rider.userId !== null) return String(rider.userId)
  if (rider.name !== null) return `~${rider.name}`
  return ""
}

/** Shared search schema for bracket setup + prelims + ranking */
export const bracketSearchSchema = z.object({
  name: z.string().optional(),
  riders: z.string().optional(),
  prelimTime: z.coerce.number().min(1).max(3600).optional().default(60),
  battleTime: z.coerce.number().min(1).max(3600).optional().default(60),
  finalsTime: z.coerce.number().min(1).max(3600).optional().default(120),
  bracketSize: z.coerce.number().optional().default(8),
})

/** Search schema for prelims page */
export const prelimsSearchSchema = bracketSearchSchema.extend({
  done: z.string().optional(),
  dq: z.string().optional(),
  current: z.coerce.number().optional(),
})

/** Search schema for ranking page */
export const rankingSearchSchema = bracketSearchSchema.extend({
  ranked: z.string().optional(),
})

/** Extended schema for main bracket page (includes fullscreen) */
export const bracketPageSearchSchema = bracketSearchSchema.extend({
  fullscreen: z.coerce.boolean().optional(),
  // Winners string managed by nuqs, but declared here so TanStack Router doesn't strip it
  // Use coerce because numeric-looking strings like "12" may be parsed as numbers
  w: z.coerce.string().optional(),
})

/**
 * Encode winners to compact string.
 * Each character represents a match winner: '1', '2', or '-' (undecided).
 * Matches are ordered by round then position within round.
 */
export function encodeWinners(
  matches: { round: number; position: number; winner: 1 | 2 | null }[],
): string | null {
  // Sort matches by round, then position
  const sorted = [...matches].toSorted((a, b) => {
    if (a.round !== b.round) return a.round - b.round
    return a.position - b.position
  })

  const encoded = sorted
    .map((m) => (m.winner === 1 ? "1" : m.winner === 2 ? "2" : "-"))
    .join("")

  // Return null if all undecided (no need to store in URL)
  if (encoded.replaceAll("-", "") === "") return null

  // Trim trailing dashes for cleaner URLs
  return encoded.replace(/-+$/, "") || null
}

/**
 * Decode winners from compact string.
 * Returns a map of match index to winner (1 or 2).
 */
export function decodeWinners(encoded: string | null): Map<number, 1 | 2> {
  const winners = new Map<number, 1 | 2>()
  if (!encoded) return winners

  for (const [i, char] of [...encoded].entries()) {
    if (char === "1") winners.set(i, 1)
    else if (char === "2") winners.set(i, 2)
    // '-' or any other char means undecided, skip
  }

  return winners
}
