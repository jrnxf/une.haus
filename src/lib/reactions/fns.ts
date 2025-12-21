import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  likeRecordSchema,
  recordTypeWithLikes,
  unlikeRecordSchema,
  type RecordWithLikesType,
} from "~/lib/reactions/schemas";

import { and, eq } from "drizzle-orm";

import { db } from "~/db";
import {
  chatMessageLikes,
  postLikes,
  postMessageLikes,
  riuSetLikes,
} from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { authMiddleware } from "~/lib/middleware";

// react as in the action, not the library lol
export const likeRecordServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(likeRecordSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { recordId, type } = input;

    const table = getTableByType(type);

    const columnName = `${type}Id` as const;

    return await db
      .insert(table)
      .values({
        [columnName]: recordId,
        userId,
      })
      .returning();
  });

export const unlikeRecordServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unlikeRecordSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    const { recordId, type } = input;

    const table = getTableByType(type);

    const columnName = `${type}Id` as const;

    invariant(table, "Invalid table");

    return await db
      .delete(table)
      // @ts-expect-error TODO COLBY
      .where(and(eq(table[columnName], recordId), eq(table.userId, userId)))
      .returning();
  });

export const getTableByType = (type: RecordWithLikesType) => {
  const table =
    type === "post"
      ? postLikes
      : type === "chatMessage"
        ? chatMessageLikes
        : type === "postMessage"
          ? postMessageLikes
          : type === "riuSet"
            ? riuSetLikes
            : undefined;

  invariant(
    table,
    `Expected type to be one of ${recordTypeWithLikes.join(", ")}. Received ${type}`,
  );

  return table;
};
