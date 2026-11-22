import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm"
import { z } from "zod"

import { bius, riuSets, rius, sius, users } from "~/db/schema"
import { RIU_STATUSES } from "~/lib/games/rius/lifecycle"
import { CHAINS } from "~/mcp/tools/chains"
import { type ToolDb, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT } from "~/mcp/tools/result"
import { riuStandings } from "~/mcp/tools/riu-standings"

const rider = z.object({ id: z.number(), name: z.string() })

// SIU statuses are a subset of the RIU ones, so one enum covers both.
const STATUSES = RIU_STATUSES

const roundsOutput = z.object({
  rounds: z.array(
    z.object({
      roundId: z.number(),
      // RIU and SIU rounds are active or archived. BIU rounds have no status.
      status: z.enum(STATUSES).nullable(),
      createdAt: z.string(),
      // When an SIU round was archived. Null for RIU and BIU.
      endedAt: z.string().nullable(),
      sets: z.number(),
      latestSet: z.string().nullable(),
      // RIU: rank 1 by points, the winner of an archived round or the leader
      // of the active one. BIU and SIU have no scores: the rider of the
      // newest set is in the lead, and in an archived SIU round, the last to
      // set held the lead when it ended. Null when the round has no sets.
      leader: rider.nullable(),
    }),
  ),
})

type Round = {
  id: number
  status: (typeof STATUSES)[number] | null
  createdAt: Date
  endedAt: Date | null
}

type Rider = z.infer<typeof rider>
type SetRow = {
  roundId: number
  name: string
  riderId: number
  riderName: string
}

// Sets per round: how many, the name of the newest one and its rider. Rows
// must come newest first.
function countSets(rows: SetRow[]) {
  const byRound = new Map<
    number,
    { sets: number; latestSet: string; latestRider: Rider }
  >()
  for (const row of rows) {
    const entry = byRound.get(row.roundId)
    if (entry) entry.sets += 1
    else
      byRound.set(row.roundId, {
        sets: 1,
        latestSet: row.name,
        latestRider: { id: row.riderId, name: row.riderName },
      })
  }
  return byRound
}

async function riuRounds(db: ToolDb, limit: number) {
  // An upcoming round's roster is private until the round starts, so the
  // round is left out, set count and all.
  const rounds: Round[] = (
    await db
      .select({
        id: rius.id,
        status: rius.status,
        createdAt: rius.createdAt,
      })
      .from(rius)
      .where(ne(rius.status, "upcoming"))
      .orderBy(desc(rius.id))
      .limit(limit)
  ).map((round) => ({ ...round, endedAt: null }))

  const ids = rounds.map((round) => round.id)
  const sets =
    ids.length === 0
      ? []
      : await db
          .select({
            roundId: riuSets.riuId,
            name: riuSets.name,
            riderId: users.id,
            riderName: users.name,
          })
          .from(riuSets)
          .innerJoin(users, eq(users.id, riuSets.userId))
          .where(inArray(riuSets.riuId, ids))
          .orderBy(desc(riuSets.id))
  const standings = await riuStandings(db, { roundIds: ids })
  const leaders = new Map<number, Rider>()
  for (const [roundId, ranks] of standings) {
    const first = ranks[0]
    if (first) leaders.set(roundId, first.rider)
  }
  return { rounds, sets, leaders }
}

async function chainRounds(db: ToolDb, game: "biu" | "siu", limit: number) {
  const rounds: Round[] =
    game === "siu"
      ? await db
          .select({
            id: sius.id,
            status: sius.status,
            createdAt: sius.createdAt,
            endedAt: sius.endedAt,
          })
          .from(sius)
          .orderBy(desc(sius.createdAt), desc(sius.id))
          .limit(limit)
      : (
          await db
            .select({ id: bius.id, createdAt: bius.createdAt })
            .from(bius)
            .orderBy(desc(bius.createdAt), desc(bius.id))
            .limit(limit)
        ).map((round) => ({
          ...round,
          status: null,
          endedAt: null,
        }))

  // A soft-deleted set is gone from the site, so it does not count.
  const c = CHAINS[game]
  const ids = rounds.map((round) => round.id)
  const sets =
    ids.length === 0
      ? []
      : await db
          .select({
            roundId: c.setRoundId,
            name: c.sets.name,
            riderId: users.id,
            riderName: users.name,
          })
          .from(c.sets)
          .innerJoin(users, eq(users.id, c.sets.userId))
          .where(and(inArray(c.setRoundId, ids), isNull(c.sets.deletedAt)))
          .orderBy(desc(c.sets.position))
  return { rounds, sets, leaders: null }
}

export const listRoundsTool = defineTool({
  name: "list_rounds",
  title: "List game rounds",
  description:
    "List the rounds of one une.haus game, newest first, with how many sets each has and the name of its newest set. riu = Rack It Up, the weekly game (the upcoming round is private, so it is left out). RIU rounds have winners: leader is the winner of an archived round, or who leads the active one. biu = Back It Up and siu = Stack It Up, the chain games. They have no winners as such: leader is the rider of the newest set, who is in the lead (or held it when an archived round ended). Pass a roundId to get_riu_round or get_chain_round.",
  inputSchema: z.object({
    game: z.enum(["riu", "biu", "siu"]),
    limit: z
      .number()
      .int()
      .min(1)
      .max(LIST_LIMIT.max)
      .default(LIST_LIMIT.default),
  }),
  outputSchema: roundsOutput,
  run: async (db, { game, limit }) => {
    const { rounds, sets, leaders } =
      game === "riu"
        ? await riuRounds(db, limit)
        : await chainRounds(db, game, limit)
    const counts = countSets(sets)

    return {
      rounds: rounds.map((round) => ({
        roundId: round.id,
        status: round.status,
        createdAt: round.createdAt.toISOString(),
        endedAt: round.endedAt?.toISOString() ?? null,
        sets: counts.get(round.id)?.sets ?? 0,
        latestSet: counts.get(round.id)?.latestSet ?? null,
        leader: leaders
          ? (leaders.get(round.id) ?? null)
          : (counts.get(round.id)?.latestRider ?? null),
      })),
    }
  },
})
