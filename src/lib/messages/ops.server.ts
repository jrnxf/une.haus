import "@tanstack/react-start/server-only"
import { and, eq } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSetMessages,
  chatMessages,
  type NotificationEntityType,
  postMessages,
  riuSetMessages,
  riuSubmissionMessages,
  siuSetMessages,
  utvVideoMessages,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { extractMentionedUserIds } from "~/lib/mentions/parse"
import { resolvePreview } from "~/lib/mentions/resolve.server"
import {
  type MessageParentType,
  recordWithMessagesTypes,
} from "~/lib/messages/schemas"
import {
  createNotification,
  deleteNotificationsForMessage,
  getContentOwner,
} from "~/lib/notifications/helpers.server"

// Map message parent types to notification entity types
const MESSAGE_ENTITY_TYPES: Partial<
  Record<MessageParentType, NotificationEntityType>
> = {
  post: "post",
  riuSet: "riuSet",
  riuSubmission: "riuSubmission",
  biuSet: "biuSet",
  siuSet: "siuSet",
  utvVideo: "utvVideo",
}

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

type CreateMessageArgs = {
  context: AuthenticatedContext
  data: {
    content: string
    id: number | -1
    type: MessageParentType
  }
}

export async function createMessage({
  data: input,
  context,
}: CreateMessageArgs) {
  const userId = context.user.id

  const { content, id, type } = input

  let messageId: number | undefined

  if (type === "post") {
    const [row] = await db
      .insert(postMessages)
      .values({
        content,
        postId: id,
        userId,
      })
      .returning()
    messageId = row.id
  }

  if (type === "chat") {
    const [row] = await db
      .insert(chatMessages)
      .values({
        content,
        userId,
      })
      .returning()
    messageId = row.id
  }

  if (type === "riuSet") {
    const [row] = await db
      .insert(riuSetMessages)
      .values({
        content,
        riuSetId: id,
        userId,
      })
      .returning()
    messageId = row.id
  }

  if (type === "riuSubmission") {
    const [row] = await db
      .insert(riuSubmissionMessages)
      .values({
        content,
        riuSubmissionId: id,
        userId,
      })
      .returning()
    messageId = row.id
  }

  if (type === "utvVideo") {
    const [row] = await db
      .insert(utvVideoMessages)
      .values({
        content,
        utvVideoId: id,
        userId,
      })
      .returning()
    messageId = row.id
  }

  if (type === "biuSet") {
    const [row] = await db
      .insert(biuSetMessages)
      .values({
        content,
        biuSetId: id,
        userId,
      })
      .returning()
    messageId = row.id
  }

  if (type === "siuSet") {
    const [row] = await db
      .insert(siuSetMessages)
      .values({
        content,
        siuSetId: id,
        userId,
      })
      .returning()
    messageId = row.id
  }

  const preview = await resolvePreview(content)

  // Create comment notification for the content owner (non-chat only)
  const entityType = MESSAGE_ENTITY_TYPES[type]
  let ownerId: number | null | undefined
  if (entityType) {
    ownerId = await getContentOwner(entityType, id)
    if (ownerId && ownerId !== userId) {
      createNotification({
        userId: ownerId,
        actorId: userId,
        type: "comment",
        entityType,
        entityId: id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityPreview: preview,
          messageId,
        },
      }).catch(console.error)
    }
  }

  // Notify @mentioned users (works for all message types including chat)
  const mentionedUserIds = extractMentionedUserIds(content)
  const mentionEntityType = entityType ?? "chat"
  const mentionEntityId = entityType ? id : 0
  for (const mentionedUserId of mentionedUserIds) {
    if (mentionedUserId === userId) continue
    if (mentionedUserId === ownerId) continue

    createNotification({
      userId: mentionedUserId,
      actorId: userId,
      type: "mention",
      entityType: mentionEntityType,
      entityId: mentionEntityId,
      data: {
        actorName: context.user.name,
        actorAvatarId: context.user.avatarId,
        entityPreview: preview,
        messageId,
      },
    }).catch(console.error)
  }
}

export async function updateMessage({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    content: string
    id: number
    type: MessageParentType
  }
}) {
  const userId = context.user.id

  const { content, id, type } = input

  const table = getTableByType(type)

  const existing = await db
    .select({ content: table.content })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId)))
    .then((rows) => rows[0])

  await db
    .update(table)
    .set({ content, userId })
    .where(and(eq(table.id, id), eq(table.userId, userId)))

  if (existing) {
    const oldMentions = new Set(extractMentionedUserIds(existing.content))
    const newMentions = extractMentionedUserIds(content).filter(
      (uid) => !oldMentions.has(uid),
    )

    const entityType = MESSAGE_ENTITY_TYPES[type]
    const mentionEntityType = entityType ?? "chat"
    const mentionEntityId = entityType
      ? await getMessageParentEntityId(type, id)
      : 0
    const preview = await resolvePreview(content)

    for (const mentionedUserId of newMentions) {
      if (mentionedUserId === userId) continue

      createNotification({
        userId: mentionedUserId,
        actorId: userId,
        type: "mention",
        entityType: mentionEntityType,
        entityId: mentionEntityId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityPreview: preview,
          messageId: id,
        },
      }).catch(console.error)
    }
  }
}

export async function deleteMessage({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    id: number
    type: MessageParentType
  }
}) {
  const userId = context.user.id

  const table = getTableByType(input.type)

  // Clean up message_like notifications before deleting
  const entityType = MESSAGE_ENTITY_TYPES[input.type]
  if (entityType) {
    deleteNotificationsForMessage(entityType, input.id).catch(console.error)
  } else if (input.type === "chat") {
    deleteNotificationsForMessage("chat", input.id).catch(console.error)
  }

  await db
    .delete(table)
    .where(and(eq(table.id, input.id), eq(table.userId, userId)))
}

/**
 * Look up the parent entity ID for a message.
 * For chat messages, returns 0 (no parent entity).
 */
async function getMessageParentEntityId(
  type: MessageParentType,
  messageId: number,
): Promise<number> {
  if (type === "chat") return 0

  const table = getTableByType(type)
  const fkColumn = `${type}Id`

  const row = await db
    // @ts-expect-error dynamic FK column — follows `${type}Id` pattern
    .select({ parentId: table[fkColumn] })
    .from(table)
    .where(eq(table.id, messageId))
    .then((rows) => rows[0])

  return (row?.parentId as number) ?? 0
}

export const getTableByType = (type: MessageParentType) => {
  switch (type) {
    case "post": {
      return postMessages
    }
    case "chat": {
      return chatMessages
    }
    case "riuSet": {
      return riuSetMessages
    }
    case "riuSubmission": {
      return riuSubmissionMessages
    }
    case "utvVideo": {
      return utvVideoMessages
    }
    case "biuSet": {
      return biuSetMessages
    }
    case "siuSet": {
      return siuSetMessages
    }
    default: {
      invariant(
        false,
        `Expected type to be one of ${recordWithMessagesTypes.join(", ")}. Received ${type}`,
      )
    }
  }
}
