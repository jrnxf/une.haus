import "@tanstack/react-start/server-only"
import { and, eq } from "drizzle-orm"

import {
  type DemoteVideoArgs,
  type ReorderVideosArgs,
  type ReviewVideoArgs,
  type SubmitVideoArgs,
} from "./schemas"
import { db } from "~/db"
import { tricks, trickVideos } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { createNotification } from "~/lib/notifications/helpers.server"

const MAX_ACTIVE_VIDEOS = 5

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function submitVideo({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: SubmitVideoArgs
}) {
  // Verify trick exists
  const trick = await db.query.tricks.findFirst({
    where: eq(tricks.id, data.trickId),
  })

  invariant(trick, "Trick not found")

  const [video] = await db
    .insert(trickVideos)
    .values({
      trickId: data.trickId,
      muxAssetId: data.muxAssetId,
      notes: data.notes,
      submittedByUserId: context.user.id,
      status: "pending",
    })
    .returning()

  invariant(video, "Failed to submit video")
  return video
}

export async function reviewVideo({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: ReviewVideoArgs
}) {
  const { id, status, reviewNotes } = data

  // Get the video
  const video = await db.query.trickVideos.findFirst({
    where: eq(trickVideos.id, id),
  })

  invariant(video, "Video not found")
  invariant(video.status === "pending", "Video already reviewed")

  // If approving (setting to active), check the 5-video limit
  if (status === "active") {
    const activeCount = await db.query.trickVideos.findMany({
      where: and(
        eq(trickVideos.trickId, video.trickId),
        eq(trickVideos.status, "active"),
      ),
    })

    if (activeCount.length >= MAX_ACTIVE_VIDEOS) {
      throw new Error(
        `Cannot have more than ${MAX_ACTIVE_VIDEOS} active videos. Demote one first.`,
      )
    }

    // Get the next sort order
    const maxSortOrder = Math.max(...activeCount.map((v) => v.sortOrder), -1)

    const [updatedVideo] = await db
      .update(trickVideos)
      .set({
        status,
        sortOrder: maxSortOrder + 1,
        reviewedByUserId: context.user.id,
        reviewedAt: new Date(),
      })
      .where(eq(trickVideos.id, id))
      .returning()

    // Notify the user who submitted the video
    if (video.submittedByUserId) {
      await createNotification({
        userId: video.submittedByUserId,
        actorId: context.user.id,
        type: "review",
        entityType: "trickVideo",
        entityId: id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityTitle: "approved",
          entityPreview: reviewNotes,
          trickId: video.trickId,
        },
      })
    }

    return updatedVideo
  }

  // Rejecting
  const [updatedVideo] = await db
    .update(trickVideos)
    .set({
      status,
      reviewedByUserId: context.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(trickVideos.id, id))
    .returning()

  // Notify the user who submitted the video
  if (video.submittedByUserId) {
    await createNotification({
      userId: video.submittedByUserId,
      actorId: context.user.id,
      type: "review",
      entityType: "trickVideo",
      entityId: id,
      data: {
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        entityTitle: "rejected",
        entityPreview: reviewNotes,
        trickId: video.trickId,
      },
    })
  }

  return updatedVideo
}

export async function reorderVideos({ data }: { data: ReorderVideosArgs }) {
  const { trickId, videoIds } = data

  // Verify all videos belong to this trick and are active
  const videos = await db.query.trickVideos.findMany({
    where: and(
      eq(trickVideos.trickId, trickId),
      eq(trickVideos.status, "active"),
    ),
  })

  const activeIds = new Set(videos.map((v) => v.id))
  for (const id of videoIds) {
    invariant(activeIds.has(id), `Video ${id} is not active for this trick`)
  }

  // Update sort orders
  await Promise.all(
    videoIds.map((id, index) =>
      db
        .update(trickVideos)
        .set({ sortOrder: index })
        .where(eq(trickVideos.id, id)),
    ),
  )

  return { success: true }
}

export async function demoteVideo({ data }: { data: DemoteVideoArgs }) {
  const { id } = data

  const video = await db.query.trickVideos.findFirst({
    where: eq(trickVideos.id, id),
  })

  invariant(video, "Video not found")
  invariant(video.status === "active", "Video is not active")

  const [updatedVideo] = await db
    .update(trickVideos)
    .set({
      status: "pending",
      sortOrder: 0,
    })
    .where(eq(trickVideos.id, id))
    .returning()

  return updatedVideo
}
