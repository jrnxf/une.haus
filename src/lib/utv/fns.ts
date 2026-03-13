import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { asc, count, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "~/db"
import {
  muxVideos,
  USER_DISCIPLINES,
  users,
  utvClaps,
  utvVideoLikes,
  utvVideoMessages,
  utvVideoRiders,
  utvVideoSuggestions,
  utvVideos,
} from "~/db/schema"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"
import {
  adminUpdateUtvVideo as adminUpdateUtvVideoOp,
  createUtvSuggestion as createUtvSuggestionOp,
  listUtvSuggestions as listUtvSuggestionsOp,
  listUtvVideos as listUtvVideosOp,
  reviewUtvSuggestion as reviewUtvSuggestionOp,
  updateUtvThumbnailSeconds as updateUtvThumbnailSecondsOp,
  updateUtvTitle as updateUtvTitleOp,
} from "~/lib/utv/ops.server"
import {
  createUtvSuggestionSchema,
  getUtvSuggestionSchema,
  listUtvSuggestionsSchema,
  listUtvVideosSchema,
  reviewUtvSuggestionSchema,
} from "~/lib/utv/schemas"

const getUtvVideoSchema = z.object({
  id: z.number(),
})

export const getUtvVideoServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUtvVideoSchema))
  .handler(async ({ data: { id } }) => {
    const video = await db.query.utvVideos.findFirst({
      where: eq(utvVideos.id, id),
      with: {
        video: true,
        likes: {
          with: {
            user: {
              columns: {
                avatarId: true,
                id: true,
                name: true,
              },
            },
          },
        },
        riders: {
          with: {
            user: {
              columns: {
                avatarId: true,
                id: true,
                name: true,
              },
            },
          },
          orderBy: [asc(utvVideoRiders.order)],
        },
      },
    })

    if (!video) {
      throw new Error("Video not found")
    }

    return video
  })

export const allUtvVideosServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const likesSubquery = db
    .select({
      utvVideoId: utvVideoLikes.utvVideoId,
      count: count().as("likes_count"),
    })
    .from(utvVideoLikes)
    .groupBy(utvVideoLikes.utvVideoId)
    .as("likes_sq")

  const messagesSubquery = db
    .select({
      utvVideoId: utvVideoMessages.utvVideoId,
      count: count().as("messages_count"),
    })
    .from(utvVideoMessages)
    .groupBy(utvVideoMessages.utvVideoId)
    .as("messages_sq")

  return await db
    .select({
      id: utvVideos.id,
      title: utvVideos.title,
      legacyUrl: utvVideos.legacyUrl,
      disciplines: utvVideos.disciplines,
      riders: sql<string[]>`
        COALESCE(
          (
            SELECT array_agg(DISTINCT COALESCE(${users.name}, ${utvVideoRiders.name}))
            FROM ${utvVideoRiders}
            LEFT JOIN ${users} ON ${utvVideoRiders.userId} = ${users.id}
            WHERE ${utvVideoRiders.utvVideoId} = ${utvVideos.id}
              AND COALESCE(${users.name}, ${utvVideoRiders.name}) IS NOT NULL
          ),
          ARRAY[]::text[]
        )
      `,
      scale: utvVideos.thumbnailScale,
      thumbnailSeconds: utvVideos.thumbnailSeconds,
      assetId: muxVideos.assetId,
      playbackId: muxVideos.playbackId,
      likesCount: sql<number>`COALESCE(${likesSubquery.count}, 0)`,
      messagesCount: sql<number>`COALESCE(${messagesSubquery.count}, 0)`,
    })
    .from(utvVideos)
    .leftJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
    .leftJoin(likesSubquery, eq(utvVideos.id, likesSubquery.utvVideoId))
    .leftJoin(messagesSubquery, eq(utvVideos.id, messagesSubquery.utvVideoId))
    .orderBy(asc(utvVideos.id))
})

export const listUtvRidersServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const rows = await db
    .selectDistinct({
      name: sql<string>`COALESCE(${users.name}, ${utvVideoRiders.name})`,
    })
    .from(utvVideoRiders)
    .leftJoin(users, eq(utvVideoRiders.userId, users.id))
    .where(sql`COALESCE(${users.name}, ${utvVideoRiders.name}) IS NOT NULL`)
    .orderBy(sql`COALESCE(${users.name}, ${utvVideoRiders.name})`)
  return rows.map((r) => r.name)
})

export const listUtvVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listUtvVideosSchema))
  .handler(async ({ data }) => {
    return listUtvVideosOp({ data })
  })

const saveScalesSchema = z.object({
  scales: z.record(z.string(), z.number()),
})

const saveVaultScales = createServerOnlyFn(
  async (scales: Record<string, number>) => {
    const entries = Object.entries(scales).map(([id, scale]) => ({
      id: Number(id),
      scale,
    }))

    await Promise.all(
      entries.map(({ id, scale }) =>
        db
          .update(utvVideos)
          .set({ thumbnailScale: scale })
          .where(eq(utvVideos.id, id)),
      ),
    )

    return { success: true, count: entries.length }
  },
)

export const saveUtvScalesServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(saveScalesSchema))
  .handler(async ({ data }) => {
    return saveVaultScales(data.scales)
  })

const updateScaleSchema = z.object({
  id: z.number(),
  scale: z.number().min(1).max(3),
})

export const updateUtvScaleServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateScaleSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    await db
      .update(utvVideos)
      .set({ thumbnailScale: data.scale })
      .where(eq(utvVideos.id, data.id))

    return { id: data.id, scale: data.scale }
  })

const updateThumbnailSecondsSchema = z.object({
  id: z.number(),
  thumbnailSeconds: z.number().min(0),
})

export const updateUtvThumbnailSecondsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateThumbnailSecondsSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    return updateUtvThumbnailSecondsOp({ data, context })
  })

const updateTitleSchema = z.object({
  id: z.number(),
  title: z.string(),
})

export const updateUtvTitleServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateTitleSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    return updateUtvTitleOp({ data, context })
  })

const adminUpdateSchema = z.object({
  id: z.number(),
  title: z.string(),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).nullable(),
  riders: z.array(
    z.object({
      userId: z.number().nullable(),
      name: z.string().nullable(),
    }),
  ),
  thumbnailScale: z.number().min(1).max(3),
  thumbnailSeconds: z.number().min(0),
})

export const adminUpdateUtvVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(adminUpdateSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    return adminUpdateUtvVideoOp({ data, context })
  })

export const getUtvClapsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await db.query.utvClaps.findFirst()
  return result?.count ?? 0
})

const addUtvClapsSchema = z.object({
  amount: z.number().int().positive(),
})

export const addUtvClapsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(addUtvClapsSchema))
  .handler(async ({ data }) => {
    // Upsert: insert if not exists, otherwise increment
    await db
      .insert(utvClaps)
      .values({ id: 1, count: data.amount })
      .onConflictDoUpdate({
        target: utvClaps.id,
        set: { count: sql`${utvClaps.count} + ${data.amount}` },
      })

    const result = await db.query.utvClaps.findFirst()
    return result?.count ?? 0
  })

// ==================== SUGGESTIONS ====================

export const listUtvSuggestionsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listUtvSuggestionsSchema))
  .handler(async ({ data }) => {
    return listUtvSuggestionsOp({ data })
  })

export const getUtvSuggestionServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getUtvSuggestionSchema))
  .handler(async ({ data: { id } }) => {
    const suggestion = await db.query.utvVideoSuggestions.findFirst({
      where: eq(utvVideoSuggestions.id, id),
      with: {
        utvVideo: {
          columns: {
            id: true,
            title: true,
            legacyTitle: true,
          },
          with: {
            video: {
              columns: {
                playbackId: true,
              },
            },
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
        reviewedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
    })

    return suggestion ?? null
  })

export const createUtvSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createUtvSuggestionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    return createUtvSuggestionOp({ data, context })
  })

export const reviewUtvSuggestionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewUtvSuggestionSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data, context }) => {
    return reviewUtvSuggestionOp({ data, context })
  })
