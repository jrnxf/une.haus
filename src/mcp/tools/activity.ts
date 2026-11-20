import { and, count, desc, eq, gt, inArray, isNull, ne } from "drizzle-orm"
import { z } from "zod"

import {
  biuSets,
  posts,
  riuSets,
  riuSubmissions,
  rius,
  siuSets,
  trickSubmissions,
  trickSuggestions,
  trickVideos,
  tricks,
  users,
  utvVideoSuggestions,
  utvVideos,
} from "~/db/schema"
import { type ToolDb, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT } from "~/mcp/tools/result"

const ACTIVITY_TYPES = [
  "post",
  "riuSubmission",
  "riuSet",
  "biuSet",
  "siuSet",
  "trickVideo",
] as const

const activityOutput = z.object({
  items: z.array(
    z.object({
      type: z.enum(ACTIVITY_TYPES),
      // The id to pass to the matching detail tool: get_post, get_riu_set
      // (the setId for a submission too), get_chain_set or get_trick.
      id: z.number(),
      title: z.string(),
      user: z.object({ id: z.number(), name: z.string() }),
      createdAt: z.string(),
    }),
  ),
})

const statsOutput = z.object({
  totals: z.object({
    users: z.number(),
    posts: z.number(),
    riuSets: z.number(),
    riuSubmissions: z.number(),
    biuSets: z.number(),
    siuSets: z.number(),
    tricks: z.number(),
    vaultVideos: z.number(),
  }),
  topContributors: z.array(
    z.object({ id: z.number(), name: z.string(), contentCount: z.number() }),
  ),
})

type ActivityRow = {
  type: (typeof ACTIVITY_TYPES)[number]
  id: number
  title: string
  userId: number
  userName: string
  createdAt: Date
}

export const recentActivityTool = defineTool({
  name: "recent_activity",
  title: "Recent activity",
  description:
    "What happened on une.haus since a time, newest first: posts, RIU sets and submissions, BIU and SIU sets, and new trick videos. Each item has a type and an id for the matching detail tool (for riuSubmission the id is the setId).",
  inputSchema: z.object({
    since: z.iso
      .datetime({ offset: true })
      .describe("ISO 8601 time, for example 2026-11-01T00:00:00Z"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(LIST_LIMIT.max)
      .default(LIST_LIMIT.default),
  }),
  outputSchema: activityOutput,
  run: async (db, { since, limit }) => {
    const after = new Date(since)

    // One small query per source, each cut to `limit`, then merged here.
    // Separate queries keep clear of D1's limit of 5 UNION terms.
    const sources = await Promise.all([
      db
        .select({
          id: posts.id,
          title: posts.title,
          userId: users.id,
          userName: users.name,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.userId))
        .where(gt(posts.createdAt, after))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .then((rows) => rows.map((r) => ({ ...r, type: "post" as const }))),
      // Only active rounds take submissions, so none can be in an upcoming
      // round. The id is the set, since get_riu_set shows the submission.
      db
        .select({
          id: riuSets.id,
          title: riuSets.name,
          userId: users.id,
          userName: users.name,
          createdAt: riuSubmissions.createdAt,
        })
        .from(riuSubmissions)
        .innerJoin(riuSets, eq(riuSets.id, riuSubmissions.riuSetId))
        .innerJoin(rius, eq(rius.id, riuSets.riuId))
        .innerJoin(users, eq(users.id, riuSubmissions.userId))
        .where(
          and(gt(riuSubmissions.createdAt, after), ne(rius.status, "upcoming")),
        )
        .orderBy(desc(riuSubmissions.createdAt))
        .limit(limit)
        .then((rows) =>
          rows.map((r) => ({ ...r, type: "riuSubmission" as const })),
        ),
      // A set in an upcoming round is private until the round starts.
      db
        .select({
          id: riuSets.id,
          title: riuSets.name,
          userId: users.id,
          userName: users.name,
          createdAt: riuSets.createdAt,
        })
        .from(riuSets)
        .innerJoin(rius, eq(rius.id, riuSets.riuId))
        .innerJoin(users, eq(users.id, riuSets.userId))
        .where(
          and(
            gt(riuSets.createdAt, after),
            inArray(rius.status, ["active", "archived"]),
          ),
        )
        .orderBy(desc(riuSets.createdAt))
        .limit(limit)
        .then((rows) => rows.map((r) => ({ ...r, type: "riuSet" as const }))),
      db
        .select({
          id: biuSets.id,
          title: biuSets.name,
          userId: users.id,
          userName: users.name,
          createdAt: biuSets.createdAt,
        })
        .from(biuSets)
        .innerJoin(users, eq(users.id, biuSets.userId))
        .where(and(gt(biuSets.createdAt, after), isNull(biuSets.deletedAt)))
        .orderBy(desc(biuSets.createdAt))
        .limit(limit)
        .then((rows) => rows.map((r) => ({ ...r, type: "biuSet" as const }))),
      db
        .select({
          id: siuSets.id,
          title: siuSets.name,
          userId: users.id,
          userName: users.name,
          createdAt: siuSets.createdAt,
        })
        .from(siuSets)
        .innerJoin(users, eq(users.id, siuSets.userId))
        .where(and(gt(siuSets.createdAt, after), isNull(siuSets.deletedAt)))
        .orderBy(desc(siuSets.createdAt))
        .limit(limit)
        .then((rows) => rows.map((r) => ({ ...r, type: "siuSet" as const }))),
      // Only approved videos. The id is the trick, for get_trick.
      db
        .select({
          id: tricks.id,
          title: tricks.name,
          userId: users.id,
          userName: users.name,
          createdAt: trickVideos.createdAt,
        })
        .from(trickVideos)
        .innerJoin(tricks, eq(tricks.id, trickVideos.trickId))
        .innerJoin(users, eq(users.id, trickVideos.submittedByUserId))
        .where(
          and(
            gt(trickVideos.createdAt, after),
            eq(trickVideos.status, "active"),
          ),
        )
        .orderBy(desc(trickVideos.createdAt))
        .limit(limit)
        .then((rows) =>
          rows.map((r) => ({ ...r, type: "trickVideo" as const })),
        ),
    ])

    const items: ActivityRow[] = sources
      .flat()
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)

    return {
      items: items.map((item) => ({
        type: item.type,
        id: item.id,
        title: item.title,
        user: { id: item.userId, name: item.userName },
        createdAt: item.createdAt.toISOString(),
      })),
    }
  },
})

// Content a rider made, one grouped count per source. The same sources as
// the site's contributor ranking (src/lib/stats/ops.server.ts), minus
// deleted chain sets and sets of a private upcoming RIU round.
function contentCounts(db: ToolDb) {
  return Promise.all([
    db
      .select({ userId: posts.userId, n: count() })
      .from(posts)
      .groupBy(posts.userId),
    db
      .select({ userId: riuSets.userId, n: count() })
      .from(riuSets)
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .where(ne(rius.status, "upcoming"))
      .groupBy(riuSets.userId),
    db
      .select({ userId: riuSubmissions.userId, n: count() })
      .from(riuSubmissions)
      .groupBy(riuSubmissions.userId),
    db
      .select({ userId: biuSets.userId, n: count() })
      .from(biuSets)
      .where(isNull(biuSets.deletedAt))
      .groupBy(biuSets.userId),
    db
      .select({ userId: siuSets.userId, n: count() })
      .from(siuSets)
      .where(isNull(siuSets.deletedAt))
      .groupBy(siuSets.userId),
    db
      .select({ userId: trickSubmissions.submittedByUserId, n: count() })
      .from(trickSubmissions)
      .groupBy(trickSubmissions.submittedByUserId),
    db
      .select({ userId: trickSuggestions.submittedByUserId, n: count() })
      .from(trickSuggestions)
      .groupBy(trickSuggestions.submittedByUserId),
    db
      .select({ userId: trickVideos.submittedByUserId, n: count() })
      .from(trickVideos)
      .groupBy(trickVideos.submittedByUserId),
    db
      .select({ userId: utvVideoSuggestions.submittedByUserId, n: count() })
      .from(utvVideoSuggestions)
      .groupBy(utvVideoSuggestions.submittedByUserId),
  ])
}

async function total(query: PromiseLike<{ n: number }[]>) {
  const [row] = await query
  return row?.n ?? 0
}

export const getStatsTool = defineTool({
  name: "get_stats",
  title: "Get site stats",
  description:
    "Site-wide une.haus totals (riders, posts, RIU sets and submissions, BIU and SIU sets, tricks, vault videos) and the 10 riders who made the most content.",
  inputSchema: z.object({}),
  outputSchema: statsOutput,
  run: async (db) => {
    const [totals, perSource] = await Promise.all([
      Promise.all([
        total(db.select({ n: count() }).from(users)),
        total(db.select({ n: count() }).from(posts)),
        total(
          db
            .select({ n: count() })
            .from(riuSets)
            .innerJoin(rius, eq(rius.id, riuSets.riuId))
            .where(ne(rius.status, "upcoming")),
        ),
        total(db.select({ n: count() }).from(riuSubmissions)),
        total(
          db
            .select({ n: count() })
            .from(biuSets)
            .where(isNull(biuSets.deletedAt)),
        ),
        total(
          db
            .select({ n: count() })
            .from(siuSets)
            .where(isNull(siuSets.deletedAt)),
        ),
        total(db.select({ n: count() }).from(tricks)),
        total(db.select({ n: count() }).from(utvVideos)),
      ]),
      contentCounts(db),
    ])

    const byUser = new Map<number, number>()
    for (const row of perSource.flat()) {
      byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + row.n)
    }
    const top = [...byUser.entries()]
      .toSorted((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 10)

    const names =
      top.length === 0
        ? []
        : await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(
              inArray(
                users.id,
                top.map(([id]) => id),
              ),
            )
    const nameById = new Map(names.map((u) => [u.id, u.name]))

    const [
      userCount,
      postCount,
      riuSetCount,
      riuSubmissionCount,
      biuSetCount,
      siuSetCount,
      trickCount,
      vaultVideoCount,
    ] = totals

    return {
      totals: {
        users: userCount,
        posts: postCount,
        riuSets: riuSetCount,
        riuSubmissions: riuSubmissionCount,
        biuSets: biuSetCount,
        siuSets: siuSetCount,
        tricks: trickCount,
        vaultVideos: vaultVideoCount,
      },
      topContributors: top.flatMap(([id, contentCount]) => {
        const name = nameById.get(id)
        return name ? [{ id, name, contentCount }] : []
      }),
    }
  },
})
