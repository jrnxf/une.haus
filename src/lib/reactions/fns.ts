import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
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
import { authMiddleware } from "~/lib/middleware"
import {
  createNotification,
  getContentOwner,
} from "~/lib/notifications/helpers"
import {
  likeRecordSchema,
  type RecordWithLikesType,
  recordTypeWithLikes,
  unlikeRecordSchema,
} from "~/lib/reactions/schemas"

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

// react as in the action, not the library lol
export const likeRecordServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(likeRecordSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    const { recordId, type } = input

    const table = getTableByType(type)

    const columnName = `${type}Id` as const

    const result = await db
      .insert(table)
      .values({
        [columnName]: recordId,
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
  })

export const unlikeRecordServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unlikeRecordSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    const { recordId, type } = input

    const table = getTableByType(type)

    const columnName = `${type}Id` as const

    invariant(table, "Invalid table")

    return await db
      .delete(table)
      // @ts-expect-error TODO COLBY
      .where(and(eq(table[columnName], recordId), eq(table.userId, userId)))
      .returning()
  })

export const getTableByType = (type: RecordWithLikesType) => {
  switch (type) {
    case "post": {
      return postLikes
    }
    case "chatMessage": {
      return chatMessageLikes
    }
    case "postMessage": {
      return postMessageLikes
    }
    case "riuSet": {
      return riuSetLikes
    }
    case "riuSetMessage": {
      return riuSetMessageLikes
    }
    case "riuSubmission": {
      return riuSubmissionLikes
    }
    case "riuSubmissionMessage": {
      return riuSubmissionMessageLikes
    }
    case "utvVideo": {
      return utvVideoLikes
    }
    case "utvVideoMessage": {
      return utvVideoMessageLikes
    }
    case "biuSet": {
      return biuSetLikes
    }
    case "biuSetMessage": {
      return biuSetMessageLikes
    }
    case "siuSet": {
      return siuSetLikes
    }
    case "siuSetMessage": {
      return siuSetMessageLikes
    }
    default: {
      invariant(
        false,
        `Expected type to be one of ${recordTypeWithLikes.join(", ")}. Received ${type}`,
      )
    }
  }
}
