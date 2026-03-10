import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { tournaments } from "~/db/schema"
import {
  advancePhase,
  bracketAction,
  createTournament,
  listTournaments,
  prelimAction,
  rankingAction,
} from "~/lib/tourney/ops.server"
import { type TournamentState } from "~/lib/tourney/types"
import { asUser, seedUser, truncatePublicTables } from "~/testing/integration"

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
  it("prelimAction enforces auth and persists state", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const tournament = await createTournament({
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
      prelimAction({
        ...asUser(otherUser),
        data: {
          action: { riderIndex: 1, type: "setCurrent" },
          code: tournament.code,
        },
      }),
    ).rejects.toThrow("Not authorized")

    await prelimAction({
      ...asUser(owner),
      data: {
        action: { riderIndex: 1, type: "setCurrent" },
        code: tournament.code,
      },
    })

    const reread = await db.query.tournaments.findFirst({
      where: (table, { eq }) => eq(table.id, tournament.id),
    })

    const state1 = (reread?.state ?? {}) as TournamentState
    expect(state1.currentRiderIndex).toBe(1)
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
      rankingAction({
        ...asUser(otherUser),
        data: {
          code: tournament.code,
          ranking: [1, 0, 2, 3],
        },
      }),
    ).rejects.toThrow("Not authorized")

    await rankingAction({
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
      bracketAction({
        ...asUser(otherUser),
        data: {
          action: { duration: 45, matchId: "r1-m0", type: "openTimer" },
          code: tournament.code,
        },
      }),
    ).rejects.toThrow("Not authorized")

    await bracketAction({
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

  it("advancePhase stores the new phase in the DB", async () => {
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
      advancePhase({
        ...asUser(otherUser),
        data: {
          code: tournament.code,
          phase: "ranking",
        },
      }),
    ).rejects.toThrow("Not authorized")

    const result = await advancePhase({
      ...asUser(owner),
      data: {
        code: tournament.code,
        phase: "ranking",
      },
    })

    const reread = await db.query.tournaments.findFirst({
      where: (table, { eq }) => eq(table.id, tournament.id),
    })

    expect(result?.phase).toBe("ranking")
    expect(reread?.phase).toBe("ranking")
  })

  it("listTournaments returns only tournaments owned by the caller", async () => {
    const userA = await seedUser({ name: "User A" })
    const userB = await seedUser({ name: "User B" })

    const tournamentData = {
      battleTime: 60,
      bracketSize: 4 as const,
      finalsTime: 120,
      prelimTime: 60,
      riders: makeState().riders,
    }

    const t1 = await createTournament({
      ...asUser(userA),
      data: { ...tournamentData, name: "A's First" },
    })
    const t2 = await createTournament({
      ...asUser(userA),
      data: { ...tournamentData, name: "A's Second" },
    })
    await createTournament({
      ...asUser(userB),
      data: { ...tournamentData, name: "B's Tournament" },
    })

    const listA = await listTournaments(asUser(userA))
    const listB = await listTournaments(asUser(userB))

    expect(listA).toHaveLength(2)
    expect(listA.map((t) => t.code).toSorted()).toEqual(
      [t1.code, t2.code].toSorted(),
    )

    expect(listB).toHaveLength(1)
    expect(listB[0]?.name).toBe("B's Tournament")
  })

  it("listTournaments returns empty array for user with no tournaments", async () => {
    const user = await seedUser({ name: "No Tournaments" })
    const otherUser = await seedUser({ name: "Has Tournament" })

    await createTournament({
      ...asUser(otherUser),
      data: {
        battleTime: 60,
        bracketSize: 4,
        finalsTime: 120,
        name: "Other's Tournament",
        prelimTime: 60,
        riders: makeState().riders,
      },
    })

    const list = await listTournaments(asUser(user))
    expect(list).toHaveLength(0)
  })
})
