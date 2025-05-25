import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import { posts } from "~/db/schema";
import { basePostSchema } from "~/server/fns/postsx/shared";

const schema = basePostSchema.extend({
  postId: z.number(),
});

const serverFn = createServerFn({
  method: "POST",
})
  .validator(schema)
  // TODO COLBY make sure the user is the owner of the post
  .handler(async ({ data }) => {
    const [post] = await db
      .update(posts)
      .set(data)
      .where(eq(posts.id, data.postId))
      .returning();

    return post;
  });

export const updatePost = {
  schema,
  serverFn,
};
