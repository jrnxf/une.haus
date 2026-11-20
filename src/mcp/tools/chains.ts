import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"

import {
  SIU_STATUSES,
  biuSetLikes,
  biuSetMessages,
  biuSets,
  bius,
  muxVideos,
  siuSetLikes,
  siuSetMessages,
  siuSets,
  sius,
  users,
} from "~/db/schema"
import { type ToolDb, ToolError, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT, videoUrl } from "~/mcp/tools/result"

// BIU (Back It Up) and SIU (Stack It Up) are the same chain game on two sets
// of tables: each set copies the one before it and adds a trick. One map per
// game lets every query below serve both. A soft-deleted set (deletedAt set)
// is gone from the site, so every query keeps it out.
const CHAINS = {
  biu: {
    sets: biuSets,
    setRoundId: biuSets.biuId,
    likes: biuSetLikes,
    likeSetId: biuSetLikes.biuSetId,
    messages: biuSetMessages,
    messageSetId: biuSetMessages.biuSetId,
  },
  siu: {
    sets: siuSets,
    setRoundId: siuSets.siuId,
    likes: siuSetLikes,
    likeSetId: siuSetLikes.siuSetId,
    messages: siuSetMessages,
    messageSetId: siuSetMessages.siuSetId,
  },
} as const

const gameArg = z
  .enum(["biu", "siu"])
  .describe(
    "biu = Back It Up, siu = Stack It Up. Both are chain games: each set repeats the chain so far and adds one trick",
  )

const rider = z.object({ id: z.number(), name: z.string() })
const setRef = z.object({ setId: z.number(), name: z.string(), rider })

const roundsOutput = z.object({
  rounds: z.array(
    z.object({
      roundId: z.number(),
      // SIU rounds are active or archived. BIU rounds have no status.
      status: z.enum(SIU_STATUSES).nullable(),
      createdAt: z.string(),
      // When an SIU round was archived. Always null for BIU.
      endedAt: z.string().nullable(),
      sets: z.number(),
      latestSet: z.string().nullable(),
    }),
  ),
})

const chainOutput = z.object({
  game: z.enum(["biu", "siu"]),
  roundId: z.number(),
  sets: z.array(
    z.object({
      setId: z.number(),
      position: z.number(),
      name: z.string(),
      rider,
      parentSetId: z.number().nullable(),
      likes: z.number(),
      comments: z.number(),
      videoUrl: z.string().nullable(),
    }),
  ),
})

const setOutput = z.object({
  game: z.enum(["biu", "siu"]),
  setId: z.number(),
  roundId: z.number(),
  position: z.number(),
  name: z.string(),
  rider,
  createdAt: z.string(),
  videoUrl: z.string().nullable(),
  likes: z.number(),
  parent: setRef.nullable(),
  child: setRef.nullable(),
  // The setter's first comment, which the site shows as the set's
  // instructions. Null when the setter left none.
  instructions: z.string().nullable(),
  comments: z.array(
    z.object({
      author: z.string(),
      content: z.string(),
      createdAt: z.string(),
      isInstructions: z.boolean(),
    }),
  ),
})

// Live sets per round: how many, and the name of the newest one.
async function liveSetsByRound(
  db: ToolDb,
  game: keyof typeof CHAINS,
  roundIds: number[],
) {
  const c = CHAINS[game]
  const rows =
    roundIds.length === 0
      ? []
      : await db
          .select({
            roundId: c.setRoundId,
            name: c.sets.name,
            position: c.sets.position,
          })
          .from(c.sets)
          .where(and(inArray(c.setRoundId, roundIds), isNull(c.sets.deletedAt)))
          .orderBy(desc(c.sets.position))

  const byRound = new Map<number, { sets: number; latestSet: string }>()
  for (const row of rows) {
    const entry = byRound.get(row.roundId)
    if (entry) entry.sets += 1
    else byRound.set(row.roundId, { sets: 1, latestSet: row.name })
  }
  return byRound
}

export const listChainRoundsTool = defineTool({
  name: "list_chain_rounds",
  title: "List BIU or SIU rounds",
  description:
    "List Back It Up (biu) or Stack It Up (siu) rounds, newest first, with how many sets each chain has and the name of its newest set. Call get_chain_round for one chain.",
  inputSchema: z.object({
    game: gameArg,
    limit: z
      .number()
      .int()
      .min(1)
      .max(LIST_LIMIT.max)
      .default(LIST_LIMIT.default),
  }),
  outputSchema: roundsOutput,
  run: async (db, { game, limit }) => {
    const rounds =
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
          ).map((round) => ({ ...round, status: null, endedAt: null }))

    const live = await liveSetsByRound(
      db,
      game,
      rounds.map((round) => round.id),
    )

    return {
      rounds: rounds.map((round) => ({
        roundId: round.id,
        status: round.status,
        createdAt: round.createdAt.toISOString(),
        endedAt: round.endedAt?.toISOString() ?? null,
        sets: live.get(round.id)?.sets ?? 0,
        latestSet: live.get(round.id)?.latestSet ?? null,
      })),
    }
  },
})

async function roundExists(
  db: ToolDb,
  game: keyof typeof CHAINS,
  roundId: number,
) {
  const rounds = game === "biu" ? bius : sius
  const [row] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1)
  return Boolean(row)
}

// Like and comment counts for many sets, one grouped query each.
async function engagementCounts(
  db: ToolDb,
  game: keyof typeof CHAINS,
  setIds: number[],
) {
  const c = CHAINS[game]
  if (setIds.length === 0) {
    return { likes: new Map<number, number>(), comments: new Map() }
  }
  const [likes, comments] = await Promise.all([
    db
      .select({ setId: c.likeSetId, n: count() })
      .from(c.likes)
      .where(inArray(c.likeSetId, setIds))
      .groupBy(c.likeSetId),
    db
      .select({ setId: c.messageSetId, n: count() })
      .from(c.messages)
      .where(inArray(c.messageSetId, setIds))
      .groupBy(c.messageSetId),
  ])
  return {
    likes: new Map(likes.map((row) => [row.setId, row.n])),
    comments: new Map<number, number>(
      comments.map((row) => [row.setId, row.n]),
    ),
  }
}

export const getChainRoundTool = defineTool({
  name: "get_chain_round",
  title: "Get BIU or SIU round",
  description:
    "Get one Back It Up (biu) or Stack It Up (siu) chain in order, first set first: each set's name, rider, the set it continues, likes, comments and video link. Call get_chain_set for one set's comments.",
  inputSchema: z.object({
    game: gameArg,
    roundId: z.number().int().positive().describe("the round id"),
  }),
  outputSchema: chainOutput,
  run: async (db, { game, roundId }) => {
    if (!(await roundExists(db, game, roundId))) {
      throw new ToolError(`no ${game.toUpperCase()} round with id ${roundId}`)
    }
    const c = CHAINS[game]

    const sets = await db
      .select({
        setId: c.sets.id,
        position: c.sets.position,
        name: c.sets.name,
        riderId: users.id,
        riderName: users.name,
        parentSetId: c.sets.parentSetId,
        playbackId: muxVideos.playbackId,
      })
      .from(c.sets)
      .innerJoin(users, eq(users.id, c.sets.userId))
      .leftJoin(muxVideos, eq(muxVideos.assetId, c.sets.muxAssetId))
      .where(and(eq(c.setRoundId, roundId), isNull(c.sets.deletedAt)))
      .orderBy(asc(c.sets.position))

    const counts = await engagementCounts(
      db,
      game,
      sets.map((set) => set.setId),
    )

    return {
      game,
      roundId,
      sets: sets.map((set) => ({
        setId: set.setId,
        position: set.position,
        name: set.name,
        rider: { id: set.riderId, name: set.riderName },
        parentSetId: set.parentSetId,
        likes: counts.likes.get(set.setId) ?? 0,
        comments: counts.comments.get(set.setId) ?? 0,
        videoUrl: videoUrl(set.playbackId),
      })),
    }
  },
})

// One live set as a short reference (id, name, rider), or null.
async function liveSetRef(
  db: ToolDb,
  game: keyof typeof CHAINS,
  where: "id" | "parent",
  id: number,
) {
  const c = CHAINS[game]
  const [row] = await db
    .select({
      setId: c.sets.id,
      name: c.sets.name,
      riderId: users.id,
      riderName: users.name,
    })
    .from(c.sets)
    .innerJoin(users, eq(users.id, c.sets.userId))
    .where(
      and(
        eq(where === "id" ? c.sets.id : c.sets.parentSetId, id),
        isNull(c.sets.deletedAt),
      ),
    )
    .limit(1)
  return row
    ? {
        setId: row.setId,
        name: row.name,
        rider: { id: row.riderId, name: row.riderName },
      }
    : null
}

export const getChainSetTool = defineTool({
  name: "get_chain_set",
  title: "Get BIU or SIU set",
  description:
    "Get one Back It Up (biu) or Stack It Up (siu) set by id: rider, video link, likes, the set before and after it in the chain, the setter's instructions and the latest 20 comments.",
  inputSchema: z.object({
    game: gameArg,
    setId: z.number().int().positive().describe("the set id"),
  }),
  outputSchema: setOutput,
  run: async (db, { game, setId }) => {
    const c = CHAINS[game]
    const [set] = await db
      .select({
        setId: c.sets.id,
        roundId: c.setRoundId,
        position: c.sets.position,
        name: c.sets.name,
        riderId: users.id,
        riderName: users.name,
        createdAt: c.sets.createdAt,
        parentSetId: c.sets.parentSetId,
        playbackId: muxVideos.playbackId,
      })
      .from(c.sets)
      .innerJoin(users, eq(users.id, c.sets.userId))
      .leftJoin(muxVideos, eq(muxVideos.assetId, c.sets.muxAssetId))
      .where(and(eq(c.sets.id, setId), isNull(c.sets.deletedAt)))
      .limit(1)
    if (!set)
      throw new ToolError(`no ${game.toUpperCase()} set with id ${setId}`)

    const [counts, parent, child, first, latest] = await Promise.all([
      engagementCounts(db, game, [setId]),
      set.parentSetId ? liveSetRef(db, game, "id", set.parentSetId) : null,
      liveSetRef(db, game, "parent", setId),
      // The site treats the setter's first comment as the instructions.
      db
        .select({
          id: c.messages.id,
          userId: c.messages.userId,
          content: c.messages.content,
        })
        .from(c.messages)
        .where(eq(c.messageSetId, setId))
        .orderBy(asc(c.messages.id))
        .limit(1),
      db
        .select({
          id: c.messages.id,
          author: users.name,
          content: c.messages.content,
          createdAt: c.messages.createdAt,
        })
        .from(c.messages)
        .innerJoin(users, eq(users.id, c.messages.userId))
        .where(eq(c.messageSetId, setId))
        .orderBy(desc(c.messages.id))
        .limit(20),
    ])

    const setterFirst = first[0]?.userId === set.riderId ? first[0] : null
    const instructionsId = setterFirst?.id ?? null
    const instructions = setterFirst?.content ?? null

    return {
      game,
      setId: set.setId,
      roundId: set.roundId,
      position: set.position,
      name: set.name,
      rider: { id: set.riderId, name: set.riderName },
      createdAt: set.createdAt.toISOString(),
      videoUrl: videoUrl(set.playbackId),
      likes: counts.likes.get(setId) ?? 0,
      parent,
      child,
      instructions,
      // Oldest first, so the thread reads top to bottom.
      comments: latest.toReversed().map((m) => ({
        author: m.author,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        isInstructions: m.id === instructionsId,
      })),
    }
  },
})
