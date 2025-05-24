import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { invariant } from "~/lib/invariant";

import { db } from "~/db";
import {
  createUpdateMessageSchema,
  getTableByType,
} from "~/server/fns/messages/shared";
import { authMiddleware } from "~/server/middleware/auth";

const schema = createUpdateMessageSchema;

const serverFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(schema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;

    const { content, recordId, type } = data;

    const table = getTableByType(type);

    const [messageToUpdate] = await db
      .select({ userId: table.userId })
      .from(table)
      .where(eq(table.id, recordId));

    invariant(messageToUpdate, "Message not found");
    invariant(messageToUpdate.userId === userId, "Access denied");

    return await db
      .update(table)
      .set({ content, userId })
      .where(eq(table.id, recordId))
      .returning();
  });

export const editMessage = {
  schema,
  serverFn,
};
