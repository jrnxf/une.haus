import { and, desc, inArray, isNull, ne } from "drizzle-orm"
import { z } from "zod"

import { bius, riuSets, rius, sius } from "~/db/schema"
import { RIU_STATUSES } from "~/lib/games/rius/lifecycle"
import { CHAINS } from "~/mcp/tools/chains"
import { type ToolDb, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT } from "~/mcp/tools/result"

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
    }),
  ),
})

type Round = {
  id: number
  status: (typeof STATUSES)[number] | null
  createdAt: Date
  endedAt: Date | null
}

type SetRow = { roundId: number; name: string }

// Sets per round: how many, and the name of the newest one. Rows must come
// newest first.
function countSets(rows: SetRow[]) {
  const byRound = new Map<number, { sets: number; latestSet: string }>()
  for (const row of rows) {
    const entry = byRound.get(row.roundId)
    if (entry) entry.sets += 1
    else byRound.set(row.roundId, { sets: 1, latestSet: row.name })
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
          .select({ roundId: riuSets.riuId, name: riuSets.name })
          .from(riuSets)
          .where(inArray(riuSets.riuId, ids))
          .orderBy(desc(riuSets.id))
  return { rounds, sets }
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
          .select({ roundId: c.setRoundId, name: c.sets.name })
          .from(c.sets)
          .where(and(inArray(c.setRoundId, ids), isNull(c.sets.deletedAt)))
          .orderBy(desc(c.sets.position))
  return { rounds, sets }
}

export const listRoundsTool = defineTool({
  name: "list_rounds",
  title: "List game rounds",
  description:
    "List the rounds of one une.haus game, newest first, with how many sets each has and the name of its newest set. riu = Rack It Up, the weekly game (the upcoming round is private, so it is left out). biu = Back It Up and siu = Stack It Up, the chain games. Pass a roundId to get_riu_round or get_chain_round.",
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
    const { rounds, sets } =
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
      })),
    }
  },
})
