import { eq, inArray } from "drizzle-orm"
import { z } from "zod"

import { riuSets, riuSubmissions, rius, users } from "~/db/schema"
import { calculateRiderRankings } from "~/lib/games/rius/ranking"
import { type ToolDb } from "~/mcp/tools/define"

// RIU scoring, the same as the round pages on the site (rius/ranking.ts):
// each set and each submission is 1 point. A tie goes to the rider with sets,
// then to whoever posted their last set first, then their last submission.
// Rank 1 of an archived round is its winner. Rank 1 of the active round is
// in the lead.

export const standingOutput = z.object({
  rank: z.number(),
  rider: z.object({ id: z.number(), name: z.string() }),
  sets: z.number(),
  submissions: z.number(),
  points: z.number(),
})

export type Standing = z.infer<typeof standingOutput>

// Which rounds to rank: some round ids, or every archived round.
type Scope = { roundIds: number[] } | { status: "archived" }

// Standings for each round in scope, keyed by round id. A round with no sets
// has no entry.
export async function riuStandings(db: ToolDb, scope: Scope) {
  if ("roundIds" in scope && scope.roundIds.length === 0) {
    return new Map<number, Standing[]>()
  }
  const where =
    "roundIds" in scope
      ? inArray(riuSets.riuId, scope.roundIds)
      : eq(rius.status, scope.status)

  const [sets, submissions] = await Promise.all([
    db
      .select({
        id: riuSets.id,
        roundId: riuSets.riuId,
        createdAt: riuSets.createdAt,
        userId: users.id,
        userName: users.name,
      })
      .from(riuSets)
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .innerJoin(users, eq(users.id, riuSets.userId))
      .where(where),
    db
      .select({
        id: riuSubmissions.id,
        setId: riuSubmissions.riuSetId,
        createdAt: riuSubmissions.createdAt,
        userId: users.id,
        userName: users.name,
      })
      .from(riuSubmissions)
      .innerJoin(riuSets, eq(riuSets.id, riuSubmissions.riuSetId))
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .innerJoin(users, eq(users.id, riuSubmissions.userId))
      .where(where),
  ])

  const user = (row: { userId: number; userName: string }) => ({
    id: row.userId,
    name: row.userName,
    avatarId: null,
  })

  const subsBySet = new Map<
    number,
    { id: number; createdAt: Date; user: ReturnType<typeof user> }[]
  >()
  for (const sub of submissions) {
    const list = subsBySet.get(sub.setId) ?? []
    list.push({ id: sub.id, createdAt: sub.createdAt, user: user(sub) })
    subsBySet.set(sub.setId, list)
  }

  const setsByRound = new Map<
    number,
    Parameters<typeof calculateRiderRankings>[0]
  >()
  for (const set of sets) {
    const list = setsByRound.get(set.roundId) ?? []
    list.push({
      id: set.id,
      createdAt: set.createdAt,
      user: user(set),
      submissions: subsBySet.get(set.id) ?? [],
    })
    setsByRound.set(set.roundId, list)
  }

  const standings = new Map<number, Standing[]>()
  for (const [roundId, roundSets] of setsByRound) {
    standings.set(
      roundId,
      calculateRiderRankings(roundSets).map((score) => ({
        rank: score.rank,
        rider: { id: score.user.id, name: score.user.name },
        sets: score.setsCount,
        submissions: score.submissionsCount,
        points: score.points,
      })),
    )
  }
  return standings
}
