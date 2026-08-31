import { describe, expect, it } from "bun:test"

import {
  assertCanEditSet,
  assertCanSubmit,
  assertCanViewSet,
  hoursUntilNextRotation,
  isRosterPrivate,
  msUntilNextRotation,
  ROTATION,
  type RiuStatus,
  SEEDED_STATUS,
} from "./lifecycle"

const ALL_STATUSES: (RiuStatus | null)[] = [
  "upcoming",
  "active",
  "archived",
  null,
]

describe("assertCanEditSet", () => {
  it("allows editing a set in an upcoming round", () => {
    expect(() => assertCanEditSet({ status: "upcoming" })).not.toThrow()
  })

  it.each(["active", "archived", null] as const)(
    "rejects editing when the round is %p",
    (status) => {
      expect(() => assertCanEditSet({ status })).toThrow("Access denied")
    },
  )
})

describe("assertCanSubmit", () => {
  it("allows submitting to a set in an active round", () => {
    expect(() => assertCanSubmit({ status: "active" })).not.toThrow()
  })

  it.each(["upcoming", "archived", null] as const)(
    "rejects submitting when the round is %p",
    (status) => {
      expect(() => assertCanSubmit({ status })).toThrow(
        "RIU set is not from an active RIU",
      )
    },
  )
})

describe("isRosterPrivate", () => {
  it("treats upcoming rounds as private and the rest as public", () => {
    for (const status of ALL_STATUSES) {
      expect(isRosterPrivate(status)).toBe(status === "upcoming")
    }
  })
})

describe("assertCanViewSet", () => {
  it("hides upcoming sets from non-owner, non-admin viewers", () => {
    expect(() =>
      assertCanViewSet({ status: "upcoming", isOwner: false, isAdmin: false }),
    ).toThrow("Access denied")
  })

  it("shows upcoming sets to the owner", () => {
    expect(() =>
      assertCanViewSet({ status: "upcoming", isOwner: true, isAdmin: false }),
    ).not.toThrow()
  })

  it("shows upcoming sets to an admin", () => {
    expect(() =>
      assertCanViewSet({ status: "upcoming", isOwner: false, isAdmin: true }),
    ).not.toThrow()
  })

  it.each(["active", "archived"] as const)(
    "shows %p sets to anyone",
    (status) => {
      expect(() =>
        assertCanViewSet({ status, isOwner: false, isAdmin: false }),
      ).not.toThrow()
    },
  )

  it("rejects a round with no status", () => {
    expect(() =>
      assertCanViewSet({ status: null, isOwner: true, isAdmin: true }),
    ).toThrow("Access denied")
  })
})

describe("rotation transitions", () => {
  it("advances the active round to archived before promoting upcoming", () => {
    expect(ROTATION).toEqual([
      { from: "active", to: "archived" },
      { from: "upcoming", to: "active" },
    ])
  })

  it("seeds a fresh upcoming round", () => {
    expect(SEEDED_STATUS).toBe("upcoming")
  })
})

describe("rotation cadence", () => {
  // 2026-06-21 is a Sunday; 2026-06-22 is the following Monday.
  it("is 24 hours out on the Sunday before a Monday rotation", () => {
    const sunday = new Date("2026-06-21T00:00:00.000Z")
    expect(hoursUntilNextRotation(sunday)).toBe(24)
  })

  it("is a full week out at the moment a rotation fires", () => {
    const monday = new Date("2026-06-22T00:00:00.000Z")
    expect(msUntilNextRotation(monday)).toBe(7 * 24 * 60 * 60 * 1000)
    expect(hoursUntilNextRotation(monday)).toBe(168)
  })

  it("rounds to the nearest hour rather than truncating", () => {
    // One second after a rotation fires: 167h 59m 59s until the next one, which
    // must round up to 168 (Math.floor would drop it to 167).
    const justAfter = new Date("2026-06-22T00:00:01.000Z")
    expect(hoursUntilNextRotation(justAfter)).toBe(168)
  })
})
