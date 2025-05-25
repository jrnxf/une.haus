import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { POST_TAGS } from "~/db/schema";

import { db } from "~/db";
import { posts } from "~/db/schema";

import { invariant } from "~/lib/invariant";
import { type ServerFnData } from "~/server/types";

export const basePostSchema = z.object({
  content: z.string().min(1, { message: "Required" }),
  imageUrl: z.string().url().optional().nullable(),
  tags: z
    .array(z.enum(POST_TAGS))
    .min(1, { message: "Required" })
    .max(3, { message: "No more than three tags allowed" }),
  title: z
    .string()
    .min(1, { message: "Required" })
    .max(60, { message: "Title must be less than 60 characters" }),
  videoUploadId: z.string().optional().nullable(),
  youtubeVideoId: z.string().min(11).optional().nullable(), // youtube ids are 11 characters
});

export const getPostSchema = z.object({
  postId: z.coerce.number(),
});

export const getPostServerFn = createServerFn({
  method: "GET",
})
  .validator(getPostSchema)
  .handler(async ({ data }) => {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, data.postId),
      with: {
        likes: {
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
        messages: {
          with: {
            likes: {
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
        },
        user: {
          columns: {
            avatarUrl: true,
            id: true,
            name: true,
          },
        },
        video: true,
      },
    });

    invariant(post, "Post not found");
    return post;
  });

export const getPost = {
  queryOptions: (data: ServerFnData<typeof getPostServerFn>) => {
    return queryOptions({
      queryKey: ["post", data.postId],
      queryFn: () => getPostServerFn({ data }),
    });
  },
  schema: getPostSchema,
};

const updatePostSchema = basePostSchema.extend({
  postId: z.number(),
});

const updatePostServerFn = createServerFn({
  method: "POST",
})
  .validator(updatePostSchema)
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
  schema: getPostSchema,
  serverFn: updatePostServerFn,
};

export const post = {
  get: getPost,
  update: updatePost,
};
