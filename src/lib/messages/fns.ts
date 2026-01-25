import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "~/db";
import {
  biuSetMessages,
  chatMessages,
  postMessages,
  riuSetMessages,
  riuSubmissionMessages,
  siuStackMessages,
  trickSubmissionMessages,
  trickSuggestionMessages,
  utvVideoMessages,
  type NotificationEntityType,
} from "~/db/schema";
import { invariant } from "~/lib/invariant";
import {
  createMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  recordWithMessagesTypes,
  updateMessageSchema,
  type MessageParentType,
} from "~/lib/messages/schemas";
import { authMiddleware } from "~/lib/middleware";
import { createNotification, getContentOwner } from "~/lib/notifications/helpers";

export const listMessagesServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listMessagesSchema))
  .handler(async ({ data: input }) => {
    if (input.type === "chat") {
      const twentyEightDaysAgo = new Date(
        Date.now() - 28 * 24 * 60 * 60 * 1000,
      );

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
      } as const;

      // Get all messages from the last 28 days
      const recentMessages = await db.query.chatMessages.findMany({
        orderBy: asc(chatMessages.createdAt),
        where(fields, operators) {
          return operators.gte(fields.createdAt, twentyEightDaysAgo);
        },
        with: chatMessagesWith,
      });

      // If fewer than 100 messages, fetch older ones to reach 100
      if (recentMessages.length < 100) {
        const olderMessages = await db.query.chatMessages.findMany({
          orderBy: desc(chatMessages.createdAt),
          limit: 100 - recentMessages.length,
          where(fields, operators) {
            return operators.lt(fields.createdAt, twentyEightDaysAgo);
          },
          with: chatMessagesWith,
        });

        return {
          type: "chatMessages" as const,
          messages: [...olderMessages.reverse(), ...recentMessages],
        };
      }

      return {
        type: "chatMessages" as const,
        messages: recentMessages,
      };
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
      });

      return {
        type: "postMessages" as const,
        parentId: input.id,
        messages,
      };
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
      });

      return {
        type: "riuSetMessages" as const,
        parentId: input.id,
        messages,
      };
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
      });

      return {
        type: "riuSubmissionMessages" as const,
        parentId: input.id,
        messages,
      };
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
      });

      return {
        type: "utvVideoMessages" as const,
        parentId: input.id,
        messages,
      };
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
      });

      return {
        type: "biuSetMessages" as const,
        parentId: input.id,
        messages,
      };
    }

    if (input.type === "siuStack") {
      const messages = await db.query.siuStackMessages.findMany({
        orderBy: asc(siuStackMessages.createdAt),
        where: eq(siuStackMessages.siuStackId, input.id),
        columns: {
          siuStackId: false,
        },
        with: {
          likes: {
            columns: {
              siuStackMessageId: false,
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
      });

      return {
        type: "siuStackMessages" as const,
        parentId: input.id,
        messages,
      };
    }

    if (input.type === "trickSubmission") {
      const messages = await db.query.trickSubmissionMessages.findMany({
        orderBy: asc(trickSubmissionMessages.createdAt),
        where: eq(trickSubmissionMessages.submissionId, input.id),
        columns: {
          submissionId: false,
        },
        with: {
          likes: {
            columns: {
              trickSubmissionMessageId: false,
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
      });

      return {
        type: "trickSubmissionMessages" as const,
        parentId: input.id,
        messages,
      };
    }

    if (input.type === "trickSuggestion") {
      const messages = await db.query.trickSuggestionMessages.findMany({
        orderBy: asc(trickSuggestionMessages.createdAt),
        where: eq(trickSuggestionMessages.suggestionId, input.id),
        columns: {
          suggestionId: false,
        },
        with: {
          likes: {
            columns: {
              trickSuggestionMessageId: false,
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
      });

      return {
        type: "trickSuggestionMessages" as const,
        parentId: input.id,
        messages,
      };
    }

    invariant(false, "Invalid type");
  });

// Map message parent types to notification entity types
const MESSAGE_ENTITY_TYPES: Partial<Record<MessageParentType, NotificationEntityType>> = {
  post: "post",
  riuSet: "riuSet",
  riuSubmission: "riuSubmission",
  biuSet: "biuSet",
  siuStack: "siuStack",
  utvVideo: "utvVideo",
  trickSubmission: "trickSubmission",
  trickSuggestion: "trickSuggestion",
};

export const createMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createMessageSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { content, id, type } = input;

    if (type === "post") {
      await db
        .insert(postMessages)
        .values({
          content,
          postId: id,
          userId,
        })
        .returning();
    }

    if (type === "chat") {
      await db
        .insert(chatMessages)
        .values({
          content,
          userId,
        })
        .returning();
    }

    if (type === "riuSet") {
      await db
        .insert(riuSetMessages)
        .values({
          content,
          riuSetId: id,
          userId,
        })
        .returning();
    }

    if (type === "riuSubmission") {
      await db
        .insert(riuSubmissionMessages)
        .values({
          content,
          riuSubmissionId: id,
          userId,
        })
        .returning();
    }

    if (type === "utvVideo") {
      await db
        .insert(utvVideoMessages)
        .values({
          content,
          utvVideoId: id,
          userId,
        })
        .returning();
    }

    if (type === "biuSet") {
      await db
        .insert(biuSetMessages)
        .values({
          content,
          biuSetId: id,
          userId,
        })
        .returning();
    }

    if (type === "siuStack") {
      await db
        .insert(siuStackMessages)
        .values({
          content,
          siuStackId: id,
          userId,
        })
        .returning();
    }

    if (type === "trickSubmission") {
      await db
        .insert(trickSubmissionMessages)
        .values({
          content,
          submissionId: id,
          userId,
        })
        .returning();
    }

    if (type === "trickSuggestion") {
      await db
        .insert(trickSuggestionMessages)
        .values({
          content,
          suggestionId: id,
          userId,
        })
        .returning();
    }

    // Create notification for the content owner (skip chat as it has no owner)
    const entityType = MESSAGE_ENTITY_TYPES[type];
    if (entityType) {
      const ownerId = await getContentOwner(entityType, id);
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
            entityPreview: content.slice(0, 100),
          },
        }).catch(console.error);
      }
    }
  });

export const updateMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateMessageSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { content, id, type } = input;

    const table = getTableByType(type);

    await db
      .update(table)
      .set({ content, userId })
      .where(and(eq(table.id, id), eq(table.userId, userId)));
  });

export const deleteMessageServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteMessageSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const table = getTableByType(input.type);

    await db
      .delete(table)
      .where(and(eq(table.id, input.id), eq(table.userId, userId)));
  });

export const getTableByType = (type: MessageParentType) => {
  switch (type) {
    case "post": {
      return postMessages;
    }
    case "chat": {
      return chatMessages;
    }
    case "riuSet": {
      return riuSetMessages;
    }
    case "riuSubmission": {
      return riuSubmissionMessages;
    }
    case "utvVideo": {
      return utvVideoMessages;
    }
    case "biuSet": {
      return biuSetMessages;
    }
    case "siuStack": {
      return siuStackMessages;
    }
    case "trickSubmission": {
      return trickSubmissionMessages;
    }
    case "trickSuggestion": {
      return trickSuggestionMessages;
    }
    default: {
      invariant(
        false,
        `Expected type to be one of ${recordWithMessagesTypes.join(", ")}. Received ${type}`,
      );
    }
  }
};
