import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, countDistinct, desc, eq, ilike, lt, or, sql } from "drizzle-orm"

import { db } from "~/db"
import { muxVideos, postLikes, postMessages, posts, users } from "~/db/schema"
import { PAGE_SIZE } from "~/lib/constants"
import { invariant } from "~/lib/invariant"
import {
  extractMentionedUserIds,
  stripMentionTokensPlain,
} from "~/lib/mentions/parse"
import { authMiddleware } from "~/lib/middleware"
import {
  createNotification,
  notifyFollowers,
} from "~/lib/notifications/helpers"
import {
  createPostSchema,
  deletePostSchema,
  getPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "~/lib/posts/schemas"

export const listPostsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listPostsSchema))
  .handler(async ({ data: input }) => {
    const data = await db
      .select({
        content: posts.content,
        counts: {
          likes: countDistinct(postLikes.postId),
          messages: countDistinct(postMessages.postId),
        },
        createdAt: posts.createdAt,
        id: posts.id,
        imageId: posts.imageId,
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
      .leftJoin(muxVideos, eq(posts.muxAssetId, muxVideos.assetId))
      .groupBy(posts.id, users.id, muxVideos.assetId, muxVideos.playbackId)
      .where(
        and(
          or(
            input.q ? ilike(posts.title, `%${input.q}%`) : undefined,
            input.q ? ilike(posts.content, `%${input.q}%`) : undefined,
            input.q ? ilike(users.name, `%${input.q}%`) : undefined,
          ),
          input.tags && input.tags.length > 0
            ? sql`${posts.tags}::jsonb ?| array[${sql.join(
                input.tags.map((tag) => sql`${tag}`),
                sql`, `,
              )}]`
            : undefined,
          input.cursor ? lt(posts.id, input.cursor) : undefined,
        ),
      )
      .orderBy(desc(posts.id))
      .limit(PAGE_SIZE)

    return data
  })

export const getPostServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getPostSchema))
  .handler(async ({ data: { postId } }) => {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        likes: {
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
        messages: {
          with: {
            likes: {
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
        },
        user: {
          columns: {
            avatarId: true,
            id: true,
            name: true,
          },
        },
        video: true,
      },
    })

    invariant(post, "Post not found")

    return post
  })

export const createPostServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createPostSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    const { media, ...rest } = input

    const x = {
      ...rest,
      imageId: media && media.type === "image" ? media.value : null,
      muxAssetId: media && media.type === "video" ? media.value : null,
      youtubeVideoId: media && media.type === "youtube" ? media.value : null,
      userId,
    }

    const [post] = await db.insert(posts).values(x).returning()

    invariant(post, "Failed to create post")

    // Notify followers about the new post
    notifyFollowers({
      actorId: userId,
      actorName: context.user.name,
      actorAvatarId: context.user.avatarId,
      type: "new_content",
      entityType: "post",
      entityId: post.id,
      entityTitle: post.title,
    }).catch(console.error)

    // Notify @mentioned users in the post content
    const mentionedUserIds = extractMentionedUserIds(input.content)
    const preview = stripMentionTokensPlain(input.content).slice(0, 100)
    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === userId) continue
      createNotification({
        userId: mentionedUserId,
        actorId: userId,
        type: "mention",
        entityType: "post",
        entityId: post.id,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          entityPreview: preview,
        },
      }).catch(console.error)
    }

    return post
  })

export const updatePostServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updatePostSchema))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const userId = context.user.id
    const { postId, ...updateData } = data

    const existing = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    })

    invariant(existing, "Post not found")
    invariant(existing.userId === userId, "Access denied")

    const [post] = await db
      .update(posts)
      .set({ ...updateData, userId })
      .where(eq(posts.id, postId))
      .returning()

    return post
  })

export const deletePostServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deletePostSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: postId, context }) => {
    const userId = context.user.id
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    })

    invariant(post, "Post not found")
    invariant(post.userId === userId, "Access denied")

    const [deletedPost] = await db
      .delete(posts)
      .where(eq(posts.id, postId))
      .returning()

    return deletedPost
  })
