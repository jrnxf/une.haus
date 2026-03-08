import { beforeEach, describe, expect, it } from "bun:test"

import { asUser, seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import { tournaments } from "~/db/schema"
import {
  adminHeartbeatImpl,
  advancePhaseImpl,
  bracketActionImpl,
  createTournamentImpl,
  prelimActionImpl,
  rankingActionImpl,
} from "~/lib/tourney/fns"
import {
  subscribeAdminHeartbeat,
  subscribeTourneyUpdates,
} from "~/lib/tourney/realtime"
import { type TournamentState } from "~/lib/tourney/types"

beforeEach(async () => {
  await truncatePublicTables()
})

function makeState(overrides: Partial<TournamentState> = {}): TournamentState {
  return {
    riders: [
      { userId: 1, name: "A" },
      { userId: 2, name: "B" },
      { userId: 3, name: "C" },
      { userId: 4, name: "D" },
    ],
    prelimTime: 60,
    battleTime: 60,
    finalsTime: 120,
    bracketSize: 4,
    prelimStatuses: {},
    currentRiderIndex: null,
    timer: null,
    ranking: null,
    bracketRiders: null,
    winners: null,
    celebrating: false,
    ...overrides,
  }
}

describe("tournament integration", () => {
  it("prelimAction enforces auth, persists state, and publishes updates", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const tournament = await createTournamentImpl({
      ...asUser(owner),
      data: {
        battleTime: 60,
        bracketSize: 4,
        finalsTime: 120,
        name: "Prelim Tournament",
        prelimTime: 60,
        riders: makeState().riders,
      },
    })

    await expect(
      prelimActionImpl({
        ...asUser(otherUser),
        data: {
          action: { riderIndex: 1, type: "setCurrent" },
          code: tournament.code,
        },
      }),
    ).rejects.toThrow("Not authorized")

    const updates: Array<{ phase: string; state: TournamentState }> = []
    const unsubscribe = subscribeTourneyUpdates(tournament.code, (data) => {
      updates.push(data as { phase: string; state: TournamentState })
    })

    try {
      await prelimActionImpl({
        ...asUser(owner),
        data: {
          action: { riderIndex: 1, type: "setCurrent" },
          code: tournament.code,
        },
      })
    } finally {
      unsubscribe()
    }

    const reread = await db.query.tournaments.findFirst({
      where: (table, { eq }) => eq(table.id, tournament.id),
    })

    const state1 = (reread?.state ?? {}) as TournamentState
    expect(state1.currentRiderIndex).toBe(1)
    expect(updates).toHaveLength(1)
    expect(updates[0]?.phase).toBe("prelims")
    expect(updates[0]?.state.currentRiderIndex).toBe(1)
  })

  it("rankingAction enforces auth and persists ranking state", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const [tournament] = await db
      .insert(tournaments)
      .values({
        code: "RANK",
        createdByUserId: owner.id,
        name: "Ranking Tournament",
        phase: "ranking",
        state: makeState(),
      })
      .returning()

    await expect(
      rankingActionImpl({
        ...asUser(otherUser),
        data: {
          code: tournament.code,
          ranking: [1, 0, 2, 3],
        },
      }),
    ).rejects.toThrow("Not authorized")

    await rankingActionImpl({
      ...asUser(owner),
      data: {
        code: tournament.code,
        ranking: [1, 0, 2, 3],
      },
    })

    const reread = await db.query.tournaments.findFirst({
      where: (table, { eq }) => eq(table.id, tournament.id),
    })

    const state2 = (reread?.state ?? {}) as TournamentState
    expect(state2.ranking).toEqual([1, 0, 2, 3])
  })

  it("bracketAction enforces auth and persists bracket state", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const [tournament] = await db
      .insert(tournaments)
      .values({
        code: "BRKT",
        createdByUserId: owner.id,
        name: "Bracket Tournament",
        phase: "bracket",
        state: makeState({
          bracketRiders: makeState().riders,
        }),
      })
      .returning()

    await expect(
      bracketActionImpl({
        ...asUser(otherUser),
        data: {
          action: { duration: 45, matchId: "r1-m0", type: "openTimer" },
          code: tournament.code,
        },
      }),
    ).rejects.toThrow("Not authorized")

    await bracketActionImpl({
      ...asUser(owner),
      data: {
        action: { duration: 45, matchId: "r1-m0", type: "openTimer" },
        code: tournament.code,
      },
    })

    const reread = await db.query.tournaments.findFirst({
      where: (table, { eq }) => eq(table.id, tournament.id),
    })
    const state3 = (reread?.state ?? {}) as TournamentState
    const timer = state3.timer

    expect(timer).toEqual(
      expect.objectContaining({
        active: false,
        duration: 45,
        matchId: "r1-m0",
      }),
    )
  })

  it("advancePhase stores the new phase in the DB and publishes it", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const [tournament] = await db
      .insert(tournaments)
      .values({
        code: "PHAS",
        createdByUserId: owner.id,
        name: "Phase Tournament",
        phase: "prelims",
        state: makeState({
          prelimStatuses: { 0: "done", 1: "done", 2: "done", 3: "dq" },
        }),
      })
      .returning()

    await expect(
      advancePhaseImpl({
        ...asUser(otherUser),
        data: {
          code: tournament.code,
          phase: "ranking",
        },
      }),
    ).rejects.toThrow("Not authorized")

    const updates: Array<{ phase: string; state: TournamentState }> = []
    const unsubscribe = subscribeTourneyUpdates(tournament.code, (data) => {
      updates.push(data as { phase: string; state: TournamentState })
    })

    let result: { phase: string; state: TournamentState } | undefined
    try {
      result = await advancePhaseImpl({
        ...asUser(owner),
        data: {
          code: tournament.code,
          phase: "ranking",
        },
      })
    } finally {
      unsubscribe()
    }

    const reread = await db.query.tournaments.findFirst({
      where: (table, { eq }) => eq(table.id, tournament.id),
    })

    expect(result?.phase).toBe("ranking")
    expect(reread?.phase).toBe("ranking")
    expect(updates).toHaveLength(1)
    expect(updates[0]?.phase).toBe("ranking")
  })

  it("adminHeartbeat publishes a heartbeat for the tournament owner", async () => {
    const owner = await seedUser({ name: "Owner" })
    const tournament = await createTournamentImpl({
      ...asUser(owner),
      data: {
        battleTime: 60,
        bracketSize: 4,
        finalsTime: 120,
        name: "Heartbeat Tournament",
        prelimTime: 60,
        riders: makeState().riders,
      },
    })

    let heartbeatCount = 0
    const unsubscribe = subscribeAdminHeartbeat(tournament.code, () => {
      heartbeatCount += 1
    })

    try {
      await adminHeartbeatImpl({
        ...asUser(owner),
        data: {
          code: tournament.code,
        },
      })
    } finally {
      unsubscribe()
    }

    expect(heartbeatCount).toBe(1)
  })
})
