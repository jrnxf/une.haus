// The RIU ("Rack It Up") round lifecycle, expressed once.
//
// A round moves through three statuses. Riders post sets while a round is
// upcoming, then submissions once it becomes active; archived rounds are
// read-only history. The weekly rotation advances every round one step and
// seeds a fresh upcoming round, so the invariant is exactly one active and one
// upcoming round at any time.
//
// This module is deliberately dependency-free: it owns the status vocabulary,
// the legal transitions, the guard rules, and the rotation cadence, and nothing
// else. The database side of the rotation lives in `lifecycle.server.ts`; the
// pure rules here are what callers, the schema enum, the cron config, and the
// unit tests all consult.

export const RIU_STATUSES = ["archived", "active", "upcoming"] as const

export type RiuStatus = (typeof RIU_STATUSES)[number]

// A round carries a status. Queries surface it as nullable because the column
// has a default rather than a NOT NULL constraint, so the guards below treat a
// null status as "not in any actionable state".
export type RiuRound = { status: RiuStatus | null }

// The rotation advances each existing round one step along this chain, applied
// in the order listed so the active round vacates before the upcoming round
// takes its place. A fresh round is then seeded at SEEDED_STATUS.
export const ROTATION: readonly { from: RiuStatus; to: RiuStatus }[] = [
  { from: "active", to: "archived" },
  { from: "upcoming", to: "active" },
] as const

export const SEEDED_STATUS: RiuStatus = "upcoming"

// Rounds rotate at the start of each ISO week: Monday 00:00 UTC. Declared once
// here so the Nitro cron schedule and the reminder timing both derive from it.
export const ROTATION_CRON = "0 0 * * 1"

// --------------------------------------------------------------------------
// Guards — the status rules that gate set/submission mutations and visibility.
// Assertions throw the exact error copy callers relied on before these rules
// were centralised.
// --------------------------------------------------------------------------

// Sets can only be created, edited, or deleted while their round is upcoming.
export function assertCanEditSet(round: RiuRound): void {
  if (round.status !== "upcoming") {
    throw new Error("Access denied")
  }
}

// Submissions can only be posted against a set whose round is active.
export function assertCanSubmit(round: RiuRound): void {
  if (round.status !== "active") {
    throw new Error("RIU set is not from an active RIU")
  }
}

// An upcoming round's roster is private: only the set owner or an admin may see
// a set before the round goes live. Active and archived rounds are public.
export function isRosterPrivate(status: RiuStatus | null): boolean {
  return status === "upcoming"
}

// Enforce set visibility. `isOwner`/`isAdmin` are resolved by the caller (the
// admin lookup only matters, and only runs, when the roster is private).
export function assertCanViewSet(args: {
  status: RiuStatus | null
  isOwner: boolean
  isAdmin: boolean
}): void {
  if (isRosterPrivate(args.status)) {
    if (!args.isOwner && !args.isAdmin) {
      throw new Error("Access denied")
    }
    return
  }
  if (args.status !== "active" && args.status !== "archived") {
    throw new Error("Access denied")
  }
}

// --------------------------------------------------------------------------
// Cadence — timing derived from the weekly rotation.
// --------------------------------------------------------------------------

// Milliseconds from `now` until the next Monday 00:00 UTC rotation.
export function msUntilNextRotation(now: Date): number {
  const nextMonday = new Date(now)
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)
  return nextMonday.getTime() - now.getTime()
}

// Whole hours until the next rotation. Math.round (not Math.floor) so the cron
// tick closest to a UTC hour boundary wins: the cron fires at :00:01, and
// Math.floor truncated e.g. 48.99h -> 48, firing reminder emails an hour early.
export function hoursUntilNextRotation(now: Date = new Date()): number {
  return Math.round(msUntilNextRotation(now) / (1000 * 60 * 60))
}
