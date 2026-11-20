import { asc, count, desc, eq } from "drizzle-orm"
import { z } from "zod"

import {
  USER_DISCIPLINES,
  muxVideos,
  users,
  utvVideoLikes,
  utvVideoMessages,
  utvVideoRiders,
  utvVideos,
} from "~/db/schema"
import { ToolError, defineTool } from "~/mcp/tools/define"
import { videoUrl } from "~/mcp/tools/result"

const videoOutput = z.object({
  id: z.number(),
  title: z.string(),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).nullable(),
  // A rider can be a une.haus user (id set) or only a name.
  riders: z.array(z.object({ id: z.number().nullable(), name: z.string() })),
  likes: z.number(),
  videoUrl: z.string().nullable(),
  comments: z.array(
    z.object({
      author: z.string(),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
})

export const getVideoTool = defineTool({
  name: "get_video",
  title: "Get vault video",
  description:
    "Get one une.haus vault video by id: title, disciplines, riders in order, likes, a playable video link and the latest 20 comments. Call search_videos to find an id.",
  inputSchema: z.object({
    videoId: z.number().int().positive().describe("the vault video id"),
  }),
  outputSchema: videoOutput,
  run: async (db, { videoId }) => {
    const [video] = await db
      .select({
        id: utvVideos.id,
        title: utvVideos.title,
        legacyTitle: utvVideos.legacyTitle,
        disciplines: utvVideos.disciplines,
        playbackId: muxVideos.playbackId,
      })
      .from(utvVideos)
      .leftJoin(muxVideos, eq(muxVideos.assetId, utvVideos.muxAssetId))
      .where(eq(utvVideos.id, videoId))
      .limit(1)
    if (!video) throw new ToolError(`no vault video with id ${videoId}`)

    const [riders, likes, latest] = await Promise.all([
      db
        .select({
          userId: users.id,
          userName: users.name,
          name: utvVideoRiders.name,
        })
        .from(utvVideoRiders)
        .leftJoin(users, eq(users.id, utvVideoRiders.userId))
        .where(eq(utvVideoRiders.utvVideoId, videoId))
        .orderBy(asc(utvVideoRiders.order), asc(utvVideoRiders.id)),
      db
        .select({ n: count() })
        .from(utvVideoLikes)
        .where(eq(utvVideoLikes.utvVideoId, videoId))
        .then(([row]) => row?.n ?? 0),
      db
        .select({
          author: users.name,
          content: utvVideoMessages.content,
          createdAt: utvVideoMessages.createdAt,
        })
        .from(utvVideoMessages)
        .innerJoin(users, eq(users.id, utvVideoMessages.userId))
        .where(eq(utvVideoMessages.utvVideoId, videoId))
        .orderBy(desc(utvVideoMessages.id))
        .limit(20),
    ])

    return {
      id: video.id,
      // Older videos keep their title from the old site until someone
      // edits it, as the site shows.
      title: video.title || video.legacyTitle,
      disciplines: video.disciplines,
      riders: riders.flatMap((r) => {
        const name = r.userName ?? r.name
        return name ? [{ id: r.userId, name }] : []
      }),
      likes,
      videoUrl: videoUrl(video.playbackId),
      // Oldest first, so the thread reads top to bottom.
      comments: latest.toReversed().map((m) => ({
        author: m.author,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    }
  },
})
