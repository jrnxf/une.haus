import "@tanstack/react-start/server-only"
import { and, asc, count, desc, eq, ilike, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  muxVideos,
  type UserDiscipline,
  type UtvVideoSuggestionDiff,
  users,
  utvVideoLikes,
  utvVideoMessages,
  utvVideoRiders,
  utvVideoSuggestions,
  utvVideos,
} from "~/db/schema"
import { PAGE_SIZE } from "~/lib/constants"
import { invariant } from "~/lib/invariant"
import { createNotification } from "~/lib/notifications/helpers.server"

import type {
  CreateUtvSuggestionArgs,
  ListUtvSuggestionsArgs,
  ReviewUtvSuggestionArgs,
} from "~/lib/utv/schemas"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function listUtvVideos({
  data: input,
}: {
  data: {
    cursor?: null | number
    disciplines?: string[]
    q?: string
    riders?: string[]
    sort?: "engagement" | "newest" | "oldest"
  }
}) {
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
    .where(
      and(
        input.q ? ilike(utvVideos.title, `%${input.q}%`) : undefined,
        input.disciplines && input.disciplines.length > 0
          ? sql`${utvVideos.disciplines}::jsonb ?| array[${sql.join(
              input.disciplines.map((d) => sql`${d}`),
              sql`,`,
            )}]`
          : undefined,
        input.riders && input.riders.length > 0
          ? sql`
            EXISTS (
              SELECT 1 FROM ${utvVideoRiders}
              LEFT JOIN ${users} ON ${utvVideoRiders.userId} = ${users.id}
              WHERE ${utvVideoRiders.utvVideoId} = ${utvVideos.id}
              AND COALESCE(${users.name}, ${utvVideoRiders.name}) IN (${sql.join(
                input.riders.map((w) => sql`${w}`),
                sql`,`,
              )})
            )
          `
          : undefined,
      ),
    )
    .orderBy(
      input.sort === "oldest"
        ? asc(utvVideos.id)
        : input.sort === "newest"
          ? desc(utvVideos.id)
          : sql`COALESCE(${likesSubquery.count}, 0) DESC`,
      desc(utvVideos.id),
    )
    .limit(PAGE_SIZE)
    .offset(input.cursor ?? 0)
}

export async function adminUpdateUtvVideo({
  data,
}: {
  context: AuthenticatedContext
  data: {
    disciplines: UserDiscipline[] | null
    id: number
    riders: { name: string | null; userId: number | null }[]
    thumbnailScale: number
    thumbnailSeconds: number
    title: string
  }
}) {
  await db
    .update(utvVideos)
    .set({
      title: data.title,
      disciplines: data.disciplines,
      thumbnailScale: data.thumbnailScale,
      thumbnailSeconds: data.thumbnailSeconds,
    })
    .where(eq(utvVideos.id, data.id))

  // Replace riders
  await db.delete(utvVideoRiders).where(eq(utvVideoRiders.utvVideoId, data.id))

  if (data.riders.length > 0) {
    await db.insert(utvVideoRiders).values(
      data.riders.map((rider, index) => ({
        utvVideoId: data.id,
        userId: rider.userId,
        name: rider.name,
        order: index,
      })),
    )
  }

  return { id: data.id }
}

export async function updateUtvTitle({
  data,
}: {
  context: AuthenticatedContext
  data: {
    id: number
    title: string
  }
}) {
  await db
    .update(utvVideos)
    .set({ title: data.title })
    .where(eq(utvVideos.id, data.id))

  return { id: data.id, title: data.title }
}

export async function updateUtvThumbnailSeconds({
  data,
}: {
  context: AuthenticatedContext
  data: {
    id: number
    thumbnailSeconds: number
  }
}) {
  await db
    .update(utvVideos)
    .set({ thumbnailSeconds: data.thumbnailSeconds })
    .where(eq(utvVideos.id, data.id))

  return { id: data.id, thumbnailSeconds: data.thumbnailSeconds }
}

export async function createUtvSuggestion({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: CreateUtvSuggestionArgs
}) {
  const video = await db.query.utvVideos.findFirst({
    where: eq(utvVideos.id, data.utvVideoId),
  })

  invariant(video, "Video not found")

  const [suggestion] = await db
    .insert(utvVideoSuggestions)
    .values({
      utvVideoId: data.utvVideoId,
      diff: data.diff as UtvVideoSuggestionDiff,
      reason: data.reason,
      submittedByUserId: context.user.id,
    })
    .returning()

  invariant(suggestion, "Failed to create suggestion")
  return suggestion
}

export async function reviewUtvSuggestion({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: ReviewUtvSuggestionArgs
}) {
  const { id, status, reviewNotes } = data

  const suggestion = await db.query.utvVideoSuggestions.findFirst({
    where: eq(utvVideoSuggestions.id, id),
  })

  invariant(suggestion, "Suggestion not found")
  invariant(suggestion.status === "pending", "Suggestion already reviewed")

  // If approved, apply the diff
  if (status === "approved") {
    const diff = suggestion.diff
    const updateData: Record<string, unknown> = {}

    if (diff.title !== undefined) {
      updateData.title = diff.title
    }

    if (diff.disciplines !== undefined) {
      updateData.disciplines = diff.disciplines
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(utvVideos)
        .set(updateData)
        .where(eq(utvVideos.id, suggestion.utvVideoId))
    }

    if (diff.riders !== undefined) {
      await db
        .delete(utvVideoRiders)
        .where(eq(utvVideoRiders.utvVideoId, suggestion.utvVideoId))

      if (diff.riders.length > 0) {
        await db.insert(utvVideoRiders).values(
          diff.riders.map((rider, index) => ({
            utvVideoId: suggestion.utvVideoId,
            userId: rider.userId,
            name: rider.name,
            order: index,
          })),
        )
      }
    }
  }

  const [updatedSuggestion] = await db
    .update(utvVideoSuggestions)
    .set({
      status,
      reviewedByUserId: context.user.id,
      reviewedAt: new Date(),
      reviewNotes,
    })
    .where(eq(utvVideoSuggestions.id, id))
    .returning()

  // Notify submitter of review result
  if (suggestion.submittedByUserId !== context.user.id) {
    createNotification({
      userId: suggestion.submittedByUserId,
      actorId: context.user.id,
      type: "review",
      entityType: "utvVideoSuggestion",
      entityId: id,
      data: {
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        entityTitle: status === "approved" ? "approved" : "rejected",
        entityPreview: reviewNotes,
      },
    }).catch(console.error)
  }

  return updatedSuggestion
}

export async function listUtvSuggestions({
  data: input,
}: {
  data?: ListUtvSuggestionsArgs
}) {
  const limit = input?.limit ?? 20

  const suggestions = await db.query.utvVideoSuggestions.findMany({
    where: and(
      input?.status ? eq(utvVideoSuggestions.status, input.status) : undefined,
      input?.utvVideoId
        ? eq(utvVideoSuggestions.utvVideoId, input.utvVideoId)
        : undefined,
      input?.cursor ? lt(utvVideoSuggestions.id, input.cursor) : undefined,
    ),
    with: {
      utvVideo: {
        columns: {
          id: true,
          title: true,
          legacyTitle: true,
          disciplines: true,
        },
        with: {
          riders: {
            with: {
              user: { columns: { id: true, name: true } },
            },
            orderBy: [asc(utvVideoRiders.order)],
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
    },
    orderBy: [desc(utvVideoSuggestions.createdAt)],
    limit,
  })

  return suggestions
}
