import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { invariant } from "~/lib/invariant";

import { db } from "~/db";
import { chatMessages, postMessages } from "~/db/schema";
import {
  baseMessageSchema,
  createUpdateMessageSchema,
  getTableByType,
} from "~/server/fns/messages/shared";
import { authMiddleware } from "~/server/middleware/auth";

const schema = baseMessageSchema;

const serverFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(schema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;

    const { recordId, type } = data;

    const table = getTableByType(type);

    const [messageToDelete] = await db
      .select({ userId: table.userId })
      .from(table)
      .where(eq(table.id, recordId));

    invariant(messageToDelete, "Message not found");
    invariant(messageToDelete.userId === userId, "Access denied");

    return await db.delete(table).where(eq(table.id, recordId)).returning();
  });

export const editMessage = {
  schema,
  serverFn,
};
