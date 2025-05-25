import { createServerFn } from "@tanstack/react-start";

import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import { chatMessageLikes, postLikes, postMessageLikes } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import {
  reactionSchema,
  recordTypeWithLikes,
  type RecordWithLikesType,
} from "~/lib/reactions/schemas";
import { authMiddleware } from "~/lib/middleware";

// react as in the action, not the library lol
export const reactServerFn = createServerFn({
  method: "POST",
})
  .validator(reactionSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { action, recordId, type } = input;

    const table = getTableByType(type);

    const columnName = `${type}Id` as const;

    if (action === "like") {
      await db.insert(table).values({
        [columnName]: recordId,
        userId,
      });
    } else {
      await db
        .delete(table)
        .where(and(eq(table[columnName], recordId), eq(table.userId, userId)));
    }
  });

export const getTableByType = (type: RecordWithLikesType) => {
  const table =
    type === "post"
      ? postLikes
      : type === "chatMessage"
        ? chatMessageLikes
        : type === "postMessage"
          ? postMessageLikes
          : undefined;

  invariant(
    table,
    `Expected type to be one of ${recordTypeWithLikes.join(", ")}. Received ${type}`,
  );

  return table;
};
