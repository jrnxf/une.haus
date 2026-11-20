import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { z } from "zod"

import {
  muxVideos,
  tricks,
  userLocations,
  users,
  utvVideoRiders,
  utvVideos,
} from "~/db/schema"
import { type ToolDb, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT, excerpt, videoUrl } from "~/mcp/tools/result"

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
})

const videoHits = z.object({
  videos: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      disciplines: z.array(z.string()).nullable(),
      riders: z.array(z.string()),
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
    .where(
      or(like(utvVideoRiders.name, `%${q}%`), like(riderUsers.name, `%${q}%`)),
    )
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
      .where(like(users.name, `%${q}%`))
      .orderBy(asc(users.name))
      .limit(limit)
    return { users: rows }
  },
})

export const searchTricksTool = defineTool({
  name: "search_tricks",
  title: "Search tricks",
  description:
    "Search the une.haus unicycle trick glossary by name or alternate name, for example 'unispin' or '360'. Returns the description, who invented it and when.",
  inputSchema: searchInput,
  outputSchema: trickHits,
  run: async (db, { q, limit }) => {
    // alternate_names is a JSON array stored as text, so LIKE finds a
    // match inside it too.
    const rows = await db
      .select({
        id: tricks.id,
        name: tricks.name,
        alternateNames: tricks.alternateNames,
        description: tricks.description,
        inventedBy: tricks.inventedBy,
        yearLanded: tricks.yearLanded,
      })
      .from(tricks)
      .where(
        or(like(tricks.name, `%${q}%`), like(tricks.alternateNames, `%${q}%`)),
      )
      .orderBy(asc(tricks.name))
      .limit(limit)
    return {
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
    "Search the une.haus vault, the archive of unicycle videos, by title or rider name. Returns the riders and a playable video link. Call get_video for one video's likes and comments.",
  inputSchema: searchInput,
  outputSchema: videoHits,
  run: async (db, { q, limit }) => {
    const videos = await db
      .select({
        id: utvVideos.id,
        title: utvVideos.title,
        legacyTitle: utvVideos.legacyTitle,
        disciplines: utvVideos.disciplines,
        playbackId: muxVideos.playbackId,
      })
      .from(utvVideos)
      .leftJoin(muxVideos, eq(muxVideos.assetId, utvVideos.muxAssetId))
      .where(
        or(
          like(utvVideos.title, `%${q}%`),
          // An untitled video shows its title from the old site.
          and(eq(utvVideos.title, ""), like(utvVideos.legacyTitle, `%${q}%`)),
          inArray(utvVideos.id, ridersMatching(db, q)),
        ),
      )
      .orderBy(desc(utvVideos.id))
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
