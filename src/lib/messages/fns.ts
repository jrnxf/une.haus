import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { and, asc, eq } from "drizzle-orm";

import { db } from "~/db";
import {
  chatMessages,
  postMessages,
  riuSetMessages,
  riuSubmissionMessages,
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

export const listMessagesServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listMessagesSchema))
  .handler(async ({ data: input }) => {
    if (input.type === "chat") {
      const twentyEightDaysAgo = new Date(
        Date.now() - 28 * 24 * 60 * 60 * 1000,
      );

      const messages = await db.query.chatMessages.findMany({
        orderBy: asc(chatMessages.createdAt),
        limit: 100,
        where(fields, operators) {
          return operators.gte(fields.createdAt, twentyEightDaysAgo);
        },
        with: {
          likes: {
            columns: {
              chatMessageId: false,
              userId: false,
            },
            with: {
              user: {
                columns: {
                  avatarUrl: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            columns: {
              avatarUrl: true,
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        type: "chatMessages" as const,
        messages,
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
                  avatarUrl: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            columns: {
              avatarUrl: true,
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
                  avatarUrl: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            columns: {
              avatarUrl: true,
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
                  avatarUrl: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            columns: {
              avatarUrl: true,
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

    invariant(false, "Invalid type");
  });

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
  const table =
    type === "post"
      ? postMessages
      : type === "chat"
        ? chatMessages
        : type === "riuSet"
          ? riuSetMessages
          : type === "riuSubmission"
            ? riuSubmissionMessages
            : undefined;

  invariant(
    table,
    `Expected type to be one of ${recordWithMessagesTypes.join(", ")}. Received ${type}`,
  );

  return table;
};
