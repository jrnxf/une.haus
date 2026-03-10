import "@tanstack/react-start/server-only"
import { and, eq } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSetLikes,
  biuSetMessageLikes,
  chatMessageLikes,
  type NotificationEntityType,
  postLikes,
  postMessageLikes,
  riuSetLikes,
  riuSetMessageLikes,
  riuSubmissionLikes,
  riuSubmissionMessageLikes,
  siuSetLikes,
  siuSetMessageLikes,
  utvVideoLikes,
  utvVideoMessageLikes,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import {
  createNotification,
  getContentOwner,
} from "~/lib/notifications/helpers.server"
import {
  recordTypeWithLikes,
  type RecordWithLikes,
  type RecordWithLikesType,
} from "~/lib/reactions/schemas"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

// Map reaction types to notification entity types (only primary content, not messages)
const LIKEABLE_ENTITY_TYPES: Partial<
  Record<RecordWithLikesType, NotificationEntityType>
> = {
  post: "post",
  riuSet: "riuSet",
  riuSubmission: "riuSubmission",
  biuSet: "biuSet",
  siuSet: "siuSet",
  utvVideo: "utvVideo",
}

export async function likeRecord({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: RecordWithLikes
}) {
  const userId = context.user.id

  const { recordId, type } = input

  const { table } = getTableByType(type)

  const result = await db
    .insert(table)
    .values({
      [`${type}Id`]: recordId,
      userId,
    })
    .returning()

  // Create notification for primary content types (not message likes)
  const entityType = LIKEABLE_ENTITY_TYPES[type]
  if (entityType) {
    const ownerId = await getContentOwner(entityType, recordId)
    if (ownerId && ownerId !== userId) {
      createNotification({
        userId: ownerId,
        actorId: userId,
        type: "like",
        entityType,
        entityId: recordId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
        },
      }).catch(console.error)
    }
  }

  return result
}

export async function unlikeRecord({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: RecordWithLikes
}) {
  const userId = context.user.id

  const { recordId, type } = input

  const { table, column } = getTableByType(type)

  return await db
    .delete(table)
    .where(and(eq(column, recordId), eq(table.userId, userId)))
    .returning()
}

export const getTableByType = (type: RecordWithLikesType) => {
  switch (type) {
    case "post":
      return { table: postLikes, column: postLikes.postId }
    case "chatMessage":
      return { table: chatMessageLikes, column: chatMessageLikes.chatMessageId }
    case "postMessage":
      return { table: postMessageLikes, column: postMessageLikes.postMessageId }
    case "riuSet":
      return { table: riuSetLikes, column: riuSetLikes.riuSetId }
    case "riuSetMessage":
      return {
        table: riuSetMessageLikes,
        column: riuSetMessageLikes.riuSetMessageId,
      }
    case "riuSubmission":
      return {
        table: riuSubmissionLikes,
        column: riuSubmissionLikes.riuSubmissionId,
      }
    case "riuSubmissionMessage":
      return {
        table: riuSubmissionMessageLikes,
        column: riuSubmissionMessageLikes.riuSubmissionMessageId,
      }
    case "utvVideo":
      return { table: utvVideoLikes, column: utvVideoLikes.utvVideoId }
    case "utvVideoMessage":
      return {
        table: utvVideoMessageLikes,
        column: utvVideoMessageLikes.utvVideoMessageId,
      }
    case "biuSet":
      return { table: biuSetLikes, column: biuSetLikes.biuSetId }
    case "biuSetMessage":
      return {
        table: biuSetMessageLikes,
        column: biuSetMessageLikes.biuSetMessageId,
      }
    case "siuSet":
      return { table: siuSetLikes, column: siuSetLikes.siuSetId }
    case "siuSetMessage":
      return {
        table: siuSetMessageLikes,
        column: siuSetMessageLikes.siuSetMessageId,
      }
    default:
      invariant(
        false,
        `Expected type to be one of ${recordTypeWithLikes.join(", ")}. Received ${type}`,
      )
  }
}
