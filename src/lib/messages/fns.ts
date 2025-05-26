import { createServerFn } from "@tanstack/react-start";

import { and, asc, eq } from "drizzle-orm";

import { db } from "~/db";
import { chatMessages, postMessages } from "~/db/schema";
import { PAGE_SIZE } from "~/lib/constants";
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
  .validator(listMessagesSchema)
  .handler(async ({ data: input }) => {
    if (input.type === "chat") {
      const messages = await db.query.chatMessages.findMany({
        orderBy: asc(chatMessages.createdAt),
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
        limit: PAGE_SIZE,
      });

      return {
        type: "chatMessages" as const,
        parentId: input.recordId,
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

    invariant(false, "Invalid type");
  });

export const createMessageServerFn = createServerFn({
  method: "POST",
})
  .validator(createMessageSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { content, recordId, type } = input;

    if (type === "post") {
      await db.insert(postMessages).values({
        content,
        postId: recordId,
        userId,
      });
    }

    if (type === "chat") {
      await db.insert(chatMessages).values({
        content,
        userId,
      });
    }
  });

export const updateMessageServerFn = createServerFn({
  method: "POST",
})
  .validator(updateMessageSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { content, recordId, type } = input;

    const table = getTableByType(type);

    return await db
      .update(table)
      .set({ content, userId })
      .where(and(eq(table.id, recordId), eq(table.userId, userId)));
  });

export const deleteMessageServerFn = createServerFn({
  method: "POST",
})
  .validator(deleteMessageSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const { recordId, type } = input;
    const userId = context.user.id;

    const table = getTableByType(type);

    await db
      .delete(table)
      .where(and(eq(table.id, recordId), eq(table.userId, userId)));
  });

export const getTableByType = (type: MessageParentType) => {
  const table =
    type === "post" ? postMessages : type === "chat" ? chatMessages : undefined;

  invariant(
    table,
    `Expected type to be one of ${recordWithMessagesTypes.join(", ")}. Received ${type}`,
  );

  return table;
};
