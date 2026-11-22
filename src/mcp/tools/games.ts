import { and, count, desc, eq, lt, ne } from "drizzle-orm"
import { z } from "zod"

import { muxVideos, riuSets, riuSubmissions, rius, users } from "~/db/schema"
import { RIU_STATUSES, isRosterPrivate } from "~/lib/games/rius/lifecycle"
import { type ToolDb, ToolError, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT, videoUrl } from "~/mcp/tools/result"
import { riuStandings, standingOutput } from "~/mcp/tools/riu-standings"

const roundOutput = z.object({
  roundId: z.number(),
  status: z.enum(RIU_STATUSES).nullable(),
  sets: z.array(
    z.object({
      setId: z.number(),
      name: z.string(),
      instructions: z.string().nullable(),
      setter: z.string(),
      videoUrl: z.string().nullable(),
      submissions: z.number(),
    }),
  ),
  // Every rider who scored, best first. Rank 1 won an archived round, or
  // leads the active one.
  standings: z.array(standingOutput),
})

const setOutput = z.object({
  setId: z.number(),
  roundId: z.number(),
  name: z.string(),
  instructions: z.string().nullable(),
  setter: z.object({ id: z.number(), name: z.string() }),
  videoUrl: z.string().nullable(),
  submissions: z.array(
    z.object({
      submissionId: z.number(),
      rider: z.object({ id: z.number(), name: z.string() }),
      createdAt: z.string(),
      videoUrl: z.string().nullable(),
    }),
  ),
})

// "last" is the newest archived round. A number picks a round by id.
const roundArg = z
  .union([z.enum(["active", "upcoming", "last"]), z.number().int().positive()])
  .default("active")
  .describe(
    "active = this week, last = the round that just ended, or a round id. upcoming = next week, but its roster is private until the round starts, so it returns an error",
  )

// The site hides an upcoming round's sets from everyone but the setter and
// admins (isRosterPrivate). A tool does not know who calls it, so it has no
// owner exception: an upcoming roster is private to every caller.
const PRIVATE_ROSTER =
  "the upcoming RIU round's roster is private until the round starts"

async function findRoundId(db: ToolDb, round: z.infer<typeof roundArg>) {
  if (typeof round === "number") {
    const [row] = await db
      .select({ id: rius.id })
      .from(rius)
      .where(eq(rius.id, round))
      .limit(1)
    return row?.id
  }
  const status = round === "last" ? "archived" : round
  const [row] = await db
    .select({ id: rius.id })
    .from(rius)
    .where(eq(rius.status, status))
    .orderBy(desc(rius.id))
    .limit(1)
  return row?.id
}

export const getRiuRoundTool = defineTool({
  name: "get_riu_round",
  title: "Get RIU round",
  description:
    "Get a Rack It Up (RIU) round: its sets, who set each one, the set video, how many riders landed it, and the standings. RIU is the weekly une.haus game: riders post sets (tricks) for the upcoming week, then everyone tries to land them while the round is active. Each set and each landing (submission) is 1 point. Rank 1 of an archived round is its winner, and rank 1 of the active round is in the lead. Call get_riu_set for the landings of one set, and list_riu_winners for winners across rounds.",
  inputSchema: z.object({ round: roundArg }),
  outputSchema: roundOutput,
  run: async (db, { round }) => {
    const roundId = await findRoundId(db, round)
    if (!roundId) throw new ToolError(`no RIU round matches ${round}`)

    const [meta] = await db
      .select({ status: rius.status })
      .from(rius)
      .where(eq(rius.id, roundId))
      .limit(1)
    if (isRosterPrivate(meta?.status ?? null)) {
      throw new ToolError(PRIVATE_ROSTER)
    }

    // A grouped left join counts landings per set in one query.
    const sets = await db
      .select({
        setId: riuSets.id,
        name: riuSets.name,
        instructions: riuSets.instructions,
        setter: users.name,
        playbackId: muxVideos.playbackId,
        submissions: count(riuSubmissions.id),
      })
      .from(riuSets)
      .innerJoin(users, eq(users.id, riuSets.userId))
      .leftJoin(muxVideos, eq(muxVideos.assetId, riuSets.muxAssetId))
      .leftJoin(riuSubmissions, eq(riuSubmissions.riuSetId, riuSets.id))
      .where(eq(riuSets.riuId, roundId))
      .groupBy(riuSets.id)
      .orderBy(riuSets.id)

    const standings = await riuStandings(db, { roundIds: [roundId] })

    return {
      roundId,
      status: meta?.status ?? null,
      sets: sets.map(({ playbackId, ...set }) => ({
        ...set,
        videoUrl: videoUrl(playbackId),
      })),
      standings: standings.get(roundId) ?? [],
    }
  },
})

export const getRiuSetTool = defineTool({
  name: "get_riu_set",
  title: "Get RIU set",
  description:
    "Get one RIU set by id, with every submission: who landed it, when, and a link to their video. Sets in the upcoming round are private until it starts.",
  inputSchema: z.object({
    setId: z.number().int().positive().describe("the RIU set id"),
  }),
  outputSchema: setOutput,
  run: async (db, { setId }) => {
    const [set] = await db
      .select({
        setId: riuSets.id,
        roundId: riuSets.riuId,
        name: riuSets.name,
        instructions: riuSets.instructions,
        setterId: users.id,
        setterName: users.name,
        playbackId: muxVideos.playbackId,
        roundStatus: rius.status,
      })
      .from(riuSets)
      .innerJoin(users, eq(users.id, riuSets.userId))
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .leftJoin(muxVideos, eq(muxVideos.assetId, riuSets.muxAssetId))
      .where(eq(riuSets.id, setId))
      .limit(1)
    if (!set) throw new ToolError(`no RIU set with id ${setId}`)
    if (isRosterPrivate(set.roundStatus)) throw new ToolError(PRIVATE_ROSTER)

    const submissions = await db
      .select({
        submissionId: riuSubmissions.id,
        riderId: users.id,
        riderName: users.name,
        createdAt: riuSubmissions.createdAt,
        playbackId: muxVideos.playbackId,
      })
      .from(riuSubmissions)
      .innerJoin(users, eq(users.id, riuSubmissions.userId))
      .leftJoin(muxVideos, eq(muxVideos.assetId, riuSubmissions.muxAssetId))
      .where(eq(riuSubmissions.riuSetId, setId))
      .orderBy(riuSubmissions.id)

    return {
      setId: set.setId,
      roundId: set.roundId,
      name: set.name,
      instructions: set.instructions,
      setter: { id: set.setterId, name: set.setterName },
      videoUrl: videoUrl(set.playbackId),
      submissions: submissions.map((s) => ({
        submissionId: s.submissionId,
        rider: { id: s.riderId, name: s.riderName },
        createdAt: s.createdAt.toISOString(),
        videoUrl: videoUrl(s.playbackId),
      })),
    }
  },
})

const submissionsOutput = z.object({
  submissions: z.array(
    z.object({
      submissionId: z.number(),
      setId: z.number(),
      setName: z.string(),
      roundId: z.number(),
      createdAt: z.string(),
      videoUrl: z.string().nullable(),
    }),
  ),
  // Pass this back as `before` to get the next page. Null on the last page.
  nextBefore: z.number().nullable(),
})

export const listSubmissionsTool = defineTool({
  name: "list_submissions",
  title: "List RIU submissions",
  description:
    "List one rider's Rack It Up (RIU) submissions, newest first: which set they landed, in which round, and a link to their video. Call get_riu_set for the set.",
  inputSchema: z.object({
    userId: z.number().int().positive().describe("the rider's user id"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(LIST_LIMIT.max)
      .default(LIST_LIMIT.default),
    before: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("nextBefore from the previous page"),
  }),
  outputSchema: submissionsOutput,
  run: async (db, { userId, limit, before }) => {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!user) throw new ToolError(`no user with id ${userId}`)

    // Ask for one extra row. If it comes back, there is a next page. Only an
    // active round takes submissions, but the status check keeps any set of
    // a private (upcoming) roster out all the same.
    const rows = await db
      .select({
        submissionId: riuSubmissions.id,
        setId: riuSets.id,
        setName: riuSets.name,
        roundId: riuSets.riuId,
        createdAt: riuSubmissions.createdAt,
        playbackId: muxVideos.playbackId,
      })
      .from(riuSubmissions)
      .innerJoin(riuSets, eq(riuSets.id, riuSubmissions.riuSetId))
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .leftJoin(muxVideos, eq(muxVideos.assetId, riuSubmissions.muxAssetId))
      .where(
        and(
          eq(riuSubmissions.userId, userId),
          ne(rius.status, "upcoming"),
          before ? lt(riuSubmissions.id, before) : undefined,
        ),
      )
      .orderBy(desc(riuSubmissions.id))
      .limit(limit + 1)

    const page = rows.slice(0, limit)
    return {
      submissions: page.map(({ playbackId, createdAt, ...row }) => ({
        ...row,
        createdAt: createdAt.toISOString(),
        videoUrl: videoUrl(playbackId),
      })),
      nextBefore:
        rows.length > limit ? (page.at(-1)?.submissionId ?? null) : null,
    }
  },
})

const rider = z.object({ id: z.number(), name: z.string() })

const winnersOutput = z.object({
  archivedRounds: z.number(),
  // Riders by number of rounds won, most first. A tie goes to the more
  // recent win.
  mostWins: z.array(
    z.object({ rider, wins: z.number(), lastWinRoundId: z.number() }),
  ),
  // The newest archived rounds and who won each.
  recentWinners: z.array(
    z.object({ roundId: z.number(), winner: rider, points: z.number() }),
  ),
})

export const listRiuWinnersTool = defineTool({
  name: "list_riu_winners",
  title: "List RIU winners",
  description:
    "Who won Rack It Up (RIU): the riders with the most round wins across every archived round, and the winner of each recent round. The winner of a round is the rider with the most points (1 per set, 1 per landing), the same ranking the round page shows. Call get_riu_round for the full standings of one round, or the active round's leader.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(LIST_LIMIT.max)
      .default(LIST_LIMIT.default)
      .describe("how many riders and how many recent rounds to return"),
  }),
  outputSchema: winnersOutput,
  run: async (db, { limit }) => {
    const standings = await riuStandings(db, { status: "archived" })

    const rounds = [...standings.entries()]
      .flatMap(([roundId, ranks]) => {
        const first = ranks[0]
        return first
          ? [{ roundId, winner: first.rider, points: first.points }]
          : []
      })
      .sort((a, b) => b.roundId - a.roundId)

    const tally = new Map<
      number,
      { rider: z.infer<typeof rider>; wins: number; lastWinRoundId: number }
    >()
    for (const round of rounds) {
      const entry = tally.get(round.winner.id)
      if (entry) entry.wins += 1
      else
        tally.set(round.winner.id, {
          rider: round.winner,
          wins: 1,
          lastWinRoundId: round.roundId,
        })
    }

    return {
      archivedRounds: rounds.length,
      mostWins: [...tally.values()]
        .sort((a, b) => b.wins - a.wins || b.lastWinRoundId - a.lastWinRoundId)
        .slice(0, limit),
      recentWinners: rounds.slice(0, limit),
    }
  },
})
