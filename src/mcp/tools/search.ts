import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm"
import { type SQLiteColumn, alias } from "drizzle-orm/sqlite-core"
import Fuse from "fuse.js"
import { z } from "zod"

import {
  muxVideos,
  tricks,
  userLocations,
  users,
  utvVideoLikes,
  utvVideoRiders,
  utvVideos,
} from "~/db/schema"
import { type ToolDb, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT, excerpt, videoUrl } from "~/mcp/tools/result"

// Lowercase, and drop spaces, hyphens, underscores and dots, so "uni spin",
// "uni-spin" and "unispin" are the same words.
function squash(text: string) {
  return text.toLowerCase().replaceAll(/[\s._-]/g, "")
}

// LIKE on the squashed column and the squashed query. A query of only
// separators keeps its own text, so it does not match every row.
function looseLike(column: SQLiteColumn, q: string): SQL {
  const squashed = squash(q)
  if (!squashed) return like(column, `%${q}%`)
  return like(
    sql`replace(replace(replace(replace(lower(${column}), ' ', ''), '-', ''), '_', ''), '.', '')`,
    `%${squashed}%`,
  )
}

// How far a trick name may be from the query in the typo fallback, from 0
// (exact) to 1 (anything). 0.3 lets "unspin" find "unispin".
const TYPO_THRESHOLD = 0.3

// The search tools share one input shape, so the model learns it once.
const searchInput = z.object({
  q: z.string().min(2).describe("words to search for"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(LIST_LIMIT.max)
    .default(LIST_LIMIT.default),
})

const userHits = z.object({
  users: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      disciplines: z.array(z.string()).nullable(),
      location: z.string().nullable(),
    }),
  ),
})

const trickHits = z.object({
  tricks: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      alternateNames: z.array(z.string()).nullable(),
      description: z.string().nullable(),
      inventedBy: z.string().nullable(),
      yearLanded: z.number().nullable(),
    }),
  ),
  closeMatches: z
    .boolean()
    .describe(
      "true when no name held the query, so these are the nearest names, as for a typo",
    ),
})

const trickColumns = {
  id: tricks.id,
  name: tricks.name,
  alternateNames: tricks.alternateNames,
  description: tricks.description,
  inventedBy: tricks.inventedBy,
  yearLanded: tricks.yearLanded,
}

// Ids of the tricks nearest to the query by name or alternate name, best
// first. The glossary is a few hundred rows, so it fits in memory.
async function trickIdsNear(db: ToolDb, q: string, limit: number) {
  const all = await db
    .select({ id: tricks.id, name: tricks.name, alt: tricks.alternateNames })
    .from(tricks)
  const fuse = new Fuse(
    all.map((t) => ({
      id: t.id,
      names: [t.name, ...(t.alt ?? [])].map((name) => squash(name)),
    })),
    { keys: ["names"], ignoreLocation: true, threshold: TYPO_THRESHOLD },
  )
  return fuse.search(squash(q), { limit }).map((hit) => hit.item.id)
}

const videoHits = z.object({
  videos: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      disciplines: z.array(z.string()).nullable(),
      riders: z.array(z.string()),
      likes: z.number(),
      videoUrl: z.string().nullable(),
    }),
  ),
})

// Ids of vault videos with a rider whose name matches. A rider is either a
// linked user or a free-text name, so check both.
const riderUsers = alias(users, "rider_users")
function ridersMatching(db: ToolDb, q: string) {
  return db
    .select({ id: utvVideoRiders.utvVideoId })
    .from(utvVideoRiders)
    .leftJoin(riderUsers, eq(riderUsers.id, utvVideoRiders.userId))
    .where(or(looseLike(utvVideoRiders.name, q), looseLike(riderUsers.name, q)))
}

export const searchUsersTool = defineTool({
  name: "search_users",
  title: "Search users",
  description:
    "Find une.haus riders by name. Returns ids to pass to get_user or list_posts.",
  inputSchema: searchInput,
  outputSchema: userHits,
  run: async (db, { q, limit }) => {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        disciplines: users.disciplines,
        location: userLocations.label,
      })
      .from(users)
      .leftJoin(userLocations, eq(userLocations.userId, users.id))
      .where(looseLike(users.name, q))
      .orderBy(asc(users.name))
      .limit(limit)
    return { users: rows }
  },
})

export const searchTricksTool = defineTool({
  name: "search_tricks",
  title: "Search tricks",
  description:
    "Search the une.haus unicycle trick glossary by name or alternate name, for example 'unispin' or '360'. Spaces and hyphens do not matter, so 'uni spin' finds 'unispin'. With no hit, it returns the nearest names instead. Returns the description, who invented it and when.",
  inputSchema: searchInput,
  outputSchema: trickHits,
  run: async (db, { q, limit }) => {
    // alternate_names is a JSON array stored as text, so LIKE finds a
    // match inside it too.
    let rows = await db
      .select(trickColumns)
      .from(tricks)
      .where(or(looseLike(tricks.name, q), looseLike(tricks.alternateNames, q)))
      // Shortest names first, so "unispin" lists 180-unispin before
      // 1260-unispin.
      .orderBy(sql`length(${tricks.name})`, asc(tricks.name))
      .limit(limit)
    const closeMatches = rows.length === 0
    if (closeMatches) {
      const ids = await trickIdsNear(db, q, limit)
      const found =
        ids.length === 0
          ? []
          : await db
              .select(trickColumns)
              .from(tricks)
              .where(inArray(tricks.id, ids))
      rows = ids.flatMap((id) => found.filter((row) => row.id === id))
    }
    return {
      closeMatches,
      tricks: rows.map((row) => ({
        ...row,
        description: row.description ? excerpt(row.description, 400) : null,
      })),
    }
  },
})

export const searchVideosTool = defineTool({
  name: "search_videos",
  title: "Search vault videos",
  description:
    "Search or rank the une.haus vault, the archive of unicycle videos. Filter by title or rider name, or leave q out to cover the whole vault. Sort by newest or by most likes, so 'the top 10 most liked vault videos' is sort 'likes' with no q. Returns the riders, the like count and a playable video link. Call get_video for one video's comments.",
  inputSchema: searchInput.extend({
    q: searchInput.shape.q
      .optional()
      .describe(
        "words to find in the title or rider name; leave out for the whole vault",
      ),
    sort: z
      .enum(["newest", "likes"])
      .default("newest")
      .describe("newest first, or most liked first"),
  }),
  outputSchema: videoHits,
  run: async (db, { q, limit, sort }) => {
    const likes = db.$with("likes").as(
      db
        .select({
          videoId: utvVideoLikes.utvVideoId,
          n: count().as("n"),
        })
        .from(utvVideoLikes)
        .groupBy(utvVideoLikes.utvVideoId),
    )
    const likeCount = sql<number>`coalesce(${likes.n}, 0)`
    const videos = await db
      .with(likes)
      .select({
        id: utvVideos.id,
        title: utvVideos.title,
        legacyTitle: utvVideos.legacyTitle,
        disciplines: utvVideos.disciplines,
        playbackId: muxVideos.playbackId,
        likes: likeCount,
      })
      .from(utvVideos)
      .leftJoin(muxVideos, eq(muxVideos.assetId, utvVideos.muxAssetId))
      .leftJoin(likes, eq(likes.videoId, utvVideos.id))
      .where(
        q
          ? or(
              looseLike(utvVideos.title, q),
              // An untitled video shows its title from the old site.
              and(eq(utvVideos.title, ""), looseLike(utvVideos.legacyTitle, q)),
              inArray(utvVideos.id, ridersMatching(db, q)),
            )
          : undefined,
      )
      .orderBy(
        ...(sort === "likes"
          ? [desc(likeCount), desc(utvVideos.id)]
          : [desc(utvVideos.id)]),
      )
      .limit(limit)

    // Riders for every hit in one query, not one query per video.
    const riders =
      videos.length === 0
        ? []
        : await db
            .select({
              videoId: utvVideoRiders.utvVideoId,
              name: utvVideoRiders.name,
              userName: users.name,
            })
            .from(utvVideoRiders)
            .leftJoin(users, eq(users.id, utvVideoRiders.userId))
            .where(
              inArray(
                utvVideoRiders.utvVideoId,
                videos.map((v) => v.id),
              ),
            )
            .orderBy(asc(utvVideoRiders.order))

    return {
      videos: videos.map(({ playbackId, legacyTitle, ...video }) => ({
        ...video,
        title: video.title || legacyTitle,
        riders: riders
          .filter((r) => r.videoId === video.id)
          .flatMap((r) => {
            const name = r.userName ?? r.name
            return name ? [name] : []
          }),
        videoUrl: videoUrl(playbackId),
      })),
    }
  },
})
