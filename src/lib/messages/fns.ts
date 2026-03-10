import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { asc, desc, eq } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSetMessages,
  chatMessages,
  postMessages,
  riuSetMessages,
  riuSubmissionMessages,
  siuSetMessages,
  utvVideoMessages,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import {
  createMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  updateMessageSchema,
} from "~/lib/messages/schemas"
import { authMiddleware } from "~/lib/middleware"

const loadMessageOps = createServerOnlyFn(
  () => import("~/lib/messages/ops.server"),
)

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

export const createMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createMessageSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createMessage } = await loadMessageOps()
    return createMessage(ctx)
  })

export const updateMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateMessageSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { updateMessage } = await loadMessageOps()
    return updateMessage(ctx)
  })

export const deleteMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteMessageSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteMessage } = await loadMessageOps()
    return deleteMessage(ctx)
  })
