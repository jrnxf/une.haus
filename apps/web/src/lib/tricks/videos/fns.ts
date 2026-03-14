import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, asc, desc, eq, lt } from "drizzle-orm"

import {
  deleteVideoSchema,
  demoteVideoSchema,
  listPendingVideosSchema,
  listVideosSchema,
  reorderVideosSchema,
  reviewVideoSchema,
  submitVideoSchema,
} from "./schemas"
import { db } from "~/db"
import { trickVideos } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"

const loadTrickVideoOps = createServerOnlyFn(() => import("./ops.server"))

// ==================== USER OPERATIONS ====================

export const listVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listVideosSchema))
  .handler(async ({ data }) => {
    const videos = await db.query.trickVideos.findMany({
      where: and(
        eq(trickVideos.trickId, data.trickId),
        data.status ? eq(trickVideos.status, data.status) : undefined,
      ),
      with: {
        video: {
          columns: {
            playbackId: true,
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
      orderBy: [asc(trickVideos.sortOrder), asc(trickVideos.createdAt)],
    })

    return videos
  })

export const submitVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(submitVideoSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { submitVideo } = await loadTrickVideoOps()
    return submitVideo(ctx)
  })

// ==================== ADMIN OPERATIONS ====================

export const listPendingVideosServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listPendingVideosSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data: input }) => {
    const limit = input?.limit ?? 20

    const videos = await db.query.trickVideos.findMany({
      where: and(
        eq(trickVideos.status, "pending"),
        input?.cursor ? lt(trickVideos.id, input.cursor) : undefined,
      ),
      with: {
        trick: {
          columns: {
            id: true,
            slug: true,
            name: true,
          },
        },
        video: {
          columns: {
            playbackId: true,
          },
        },
        submittedBy: {
          columns: {
            id: true,
            name: true,
            avatarId: true,
          },
        },
      },
      orderBy: [desc(trickVideos.createdAt)],
      limit,
    })

    return videos
  })

export const reviewVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewVideoSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { reviewVideo } = await loadTrickVideoOps()
    return reviewVideo(ctx)
  })

export const reorderVideosServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reorderVideosSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { reorderVideos } = await loadTrickVideoOps()
    return reorderVideos(ctx)
  })

export const demoteVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(demoteVideoSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { demoteVideo } = await loadTrickVideoOps()
    return demoteVideo(ctx)
  })

export const deleteVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteVideoSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async ({ data }) => {
    const { id } = data

    const [deletedVideo] = await db
      .delete(trickVideos)
      .where(eq(trickVideos.id, id))
      .returning()

    invariant(deletedVideo, "Video not found")
    return deletedVideo
  })
