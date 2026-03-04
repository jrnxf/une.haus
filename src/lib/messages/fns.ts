import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, asc, desc, eq } from "drizzle-orm"

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
import { resolvePreview } from "~/lib/mentions/resolve"
import {
  createMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  type MessageParentType,
  recordWithMessagesTypes,
  updateMessageSchema,
} from "~/lib/messages/schemas"
import { authMiddleware } from "~/lib/middleware"
import {
  createNotification,
  getContentOwner,
} from "~/lib/notifications/helpers"

export const listMessagesServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listMessagesSchema))
  .handler(async ({ data: input }) => {
    if (input.type === "chat") {
      const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)

      const chatMessagesWith = {
        likes: {
          columns: {
            chatMessageId: false,
            userId: false,
          },
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
        user: {
          columns: {
            avatarId: true,
            id: true,
            name: true,
          },
        },
      } as const

      // Get all messages from the last 28 days
      const recentMessages = await db.query.chatMessages.findMany({
        orderBy: asc(chatMessages.createdAt),
        where(fields, operators) {
          return operators.gte(fields.createdAt, twentyEightDaysAgo)
        },
        with: chatMessagesWith,
      })

      // If fewer than 100 messages, fetch older ones to reach 100
      if (recentMessages.length < 100) {
        const olderMessages = await db.query.chatMessages.findMany({
          orderBy: desc(chatMessages.createdAt),
          limit: 100 - recentMessages.length,
          where(fields, operators) {
            return operators.lt(fields.createdAt, twentyEightDaysAgo)
          },
          with: chatMessagesWith,
        })

        return {
          type: "chatMessages" as const,
          messages: [...olderMessages.toReversed(), ...recentMessages],
        }
      }

      return {
        type: "chatMessages" as const,
        messages: recentMessages,
      }
    }

    if (input.type === "post") {
      const messages = await db.query.postMessages.findMany({
        orderBy: asc(postMessages.createdAt),
        where: eq(postMessages.postId, input.id),
        columns: {
          postId: false,
        },
        with: {
          likes: {
            columns: {
              postMessageId: false,
              userId: false,
            },
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
          user: {
            columns: {
              avatarId: true,
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        type: "postMessages" as const,
        parentId: input.id,
        messages,
      }
    }

    if (input.type === "riuSet") {
      const messages = await db.query.riuSetMessages.findMany({
        orderBy: asc(riuSetMessages.createdAt),
        where: eq(riuSetMessages.riuSetId, input.id),
        columns: {
          riuSetId: false,
        },
        with: {
          likes: {
            columns: {
              riuSetMessageId: false,
              userId: false,
            },
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
          user: {
            columns: {
              avatarId: true,
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        type: "riuSetMessages" as const,
        parentId: input.id,
        messages,
      }
    }

    if (input.type === "riuSubmission") {
      const messages = await db.query.riuSubmissionMessages.findMany({
        orderBy: asc(riuSubmissionMessages.createdAt),
        where: eq(riuSubmissionMessages.riuSubmissionId, input.id),
        columns: {
          riuSubmissionId: false,
        },
        with: {
          likes: {
            columns: {
              riuSubmissionMessageId: false,
              userId: false,
            },
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
          user: {
            columns: {
              avatarId: true,
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        type: "riuSubmissionMessages" as const,
        parentId: input.id,
        messages,
      }
    }

    if (input.type === "utvVideo") {
      const messages = await db.query.utvVideoMessages.findMany({
        orderBy: asc(utvVideoMessages.createdAt),
        where: eq(utvVideoMessages.utvVideoId, input.id),
        columns: {
          utvVideoId: false,
        },
        with: {
          likes: {
            columns: {
              utvVideoMessageId: false,
              userId: false,
            },
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
          user: {
            columns: {
              avatarId: true,
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        type: "utvVideoMessages" as const,
        parentId: input.id,
        messages,
      }
    }

    if (input.type === "biuSet") {
      const messages = await db.query.biuSetMessages.findMany({
        orderBy: asc(biuSetMessages.createdAt),
        where: eq(biuSetMessages.biuSetId, input.id),
        columns: {
          biuSetId: false,
        },
        with: {
          likes: {
            columns: {
              biuSetMessageId: false,
              userId: false,
            },
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
          user: {
            columns: {
              avatarId: true,
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        type: "biuSetMessages" as const,
        parentId: input.id,
        messages,
      }
    }

    if (input.type === "siuSet") {
      const messages = await db.query.siuSetMessages.findMany({
        orderBy: asc(siuSetMessages.createdAt),
        where: eq(siuSetMessages.siuSetId, input.id),
        columns: {
          siuSetId: false,
        },
        with: {
          likes: {
            columns: {
              siuSetMessageId: false,
              userId: false,
            },
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
          user: {
            columns: {
              avatarId: true,
              id: true,
              name: true,
            },
          },
        },
      })

      return {
        type: "siuSetMessages" as const,
        parentId: input.id,
        messages,
      }
    }

    invariant(false, "Invalid type")
  })

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

export const createMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createMessageSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
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
    const mentionEntityId = id ?? 0
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
  })

export const updateMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateMessageSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    const { content, id, type } = input

    const table = getTableByType(type)

    // Fetch old content for mention dedup
    const existing = await db
      .select({ content: table.content })
      .from(table)
      .where(and(eq(table.id, id), eq(table.userId, userId)))
      .then((rows) => rows[0])

    await db
      .update(table)
      .set({ content, userId })
      .where(and(eq(table.id, id), eq(table.userId, userId)))

    // Notify only newly added @mentions (not in old content)
    if (existing) {
      const oldMentions = new Set(extractMentionedUserIds(existing.content))
      const newMentions = extractMentionedUserIds(content).filter(
        (uid) => !oldMentions.has(uid),
      )

      const entityType = MESSAGE_ENTITY_TYPES[type]
      const mentionEntityType = entityType ?? "chat"
      // input.id is the message ID, not the parent entity ID
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
  })

export const deleteMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteMessageSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    const table = getTableByType(input.type)

    await db
      .delete(table)
      .where(and(eq(table.id, input.id), eq(table.userId, userId)))
  })

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
