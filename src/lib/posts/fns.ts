import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, ilike, lt, or } from "drizzle-orm";

import { db } from "~/db";
import { muxVideos, postLikes, postMessages, posts, users } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import {
  createPostSchema,
  deletePostSchema,
  getPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "~/lib/posts/schemas";
import { authMiddleware } from "~/lib/middleware";

export const listPostsServerFn = createServerFn({
  method: "GET",
})
  .validator(listPostsSchema)
  .handler(async ({ data: input }) => {
    const data = await db
      .select({
        content: posts.content,
        counts: {
          likes: count(postLikes.postId),
          messages: count(postMessages.postId),
        },
        createdAt: posts.createdAt,
        id: posts.id,
        imageUrl: posts.imageUrl,
        tags: posts.tags,
        title: posts.title,
        user: {
          id: users.id,
          name: users.name,
        },
        video: {
          playbackId: muxVideos.playbackId,
        },
        youtubeVideoId: posts.youtubeVideoId,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(postLikes, eq(posts.id, postLikes.postId))
      .leftJoin(postMessages, eq(posts.id, postMessages.postId))
      .leftJoin(muxVideos, eq(posts.videoUploadId, muxVideos.uploadId))
      .groupBy(posts.id, users.id, muxVideos.uploadId)
      .where(
        and(
          or(
            input.q ? ilike(posts.title, `%${input.q}%`) : undefined,
            input.q ? ilike(posts.content, `%${input.q}%`) : undefined,
            input.q ? ilike(users.name, `%${input.q}%`) : undefined,
          ),

          input.cursor ? lt(posts.id, input.cursor) : undefined,
        ),
      )
      .orderBy(desc(posts.id))
      .limit(input.limit);

    return data;
  });

export const getPostServerFn = createServerFn({
  method: "GET",
})
  .validator(getPostSchema)
  .handler(async ({ data: { postId } }) => {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
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

export const createPostServerFn = createServerFn({
  method: "POST",
})
  .validator(createPostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id;

    if (input.videoUploadId) {
      await db
        .insert(muxVideos)
        .values({
          uploadId: input.videoUploadId,
        })
        .onConflictDoNothing(); // the webhook won – the video is already ready
    }

    const [post] = await db
      .insert(posts)
      .values({
        ...input,
        userId,
      })
      .returning();

    invariant(post, "Failed to create post");

    return post;
  });

export const updatePostServerFn = createServerFn({
  method: "POST",
})
  .validator(updatePostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const { postId, ...updateData } = data;

    const [post] = await db
      .update(posts)
      .set({ ...updateData, userId })
      .where(eq(posts.id, postId))
      .returning();

    return post;
  });

export const deletePostServerFn = createServerFn({
  method: "POST",
})
  .validator(deletePostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data: postId, context }) => {
    const userId = context.user.id;
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    invariant(post, "Post not found");
    invariant(post.userId === userId, "Access denied");

    await db.delete(posts).where(eq(posts.id, postId)).returning();
  });
