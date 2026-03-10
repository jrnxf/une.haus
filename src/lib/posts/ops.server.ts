import "@tanstack/react-start/server-only"
import { and, countDistinct, desc, eq, ilike, lt, or, sql } from "drizzle-orm"

import { db } from "~/db"
import { muxVideos, postLikes, postMessages, posts, users } from "~/db/schema"
import { PAGE_SIZE } from "~/lib/constants"
import { invariant } from "~/lib/invariant"
import { extractMentionedUserIds } from "~/lib/mentions/parse"
import { resolvePreview } from "~/lib/mentions/resolve.server"
import {
  createNotification,
  notifyFollowers,
} from "~/lib/notifications/helpers.server"

import type {
  CreatePostArgs,
  DeletePostArgs,
  UpdatePostArgs,
} from "~/lib/posts/schemas"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

export async function createPost({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: CreatePostArgs
}) {
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
  const preview = await resolvePreview(input.content)
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
}

export async function listPosts({
  data: input,
}: {
  data: {
    cursor?: null | number
    q?: string
    tags?: string[]
  }
}) {
  return db
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
}

export async function getPost({
  data: { postId },
}: {
  data: {
    postId: number
  }
}) {
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
}

export async function updatePost({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: UpdatePostArgs
}) {
  const userId = context.user.id
  const { media, postId, ...updateData } = data

  const existing = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  })

  invariant(existing, "Post not found")
  invariant(existing.userId === userId, "Access denied")

  const mediaFields =
    media === undefined
      ? {}
      : {
          imageId: media && media.type === "image" ? media.value : null,
          muxAssetId: media && media.type === "video" ? media.value : null,
          youtubeVideoId:
            media && media.type === "youtube" ? media.value : null,
        }

  const [post] = await db
    .update(posts)
    .set({ ...updateData, ...mediaFields, userId })
    .where(eq(posts.id, postId))
    .returning()

  // Notify only newly added @mentions
  if (updateData.content) {
    const oldMentions = new Set(extractMentionedUserIds(existing.content))
    const newMentions = extractMentionedUserIds(updateData.content).filter(
      (uid) => !oldMentions.has(uid),
    )

    if (newMentions.length > 0) {
      const preview = await resolvePreview(updateData.content)
      for (const mentionedUserId of newMentions) {
        if (mentionedUserId === userId) continue
        createNotification({
          userId: mentionedUserId,
          actorId: userId,
          type: "mention",
          entityType: "post",
          entityId: postId,
          data: {
            actorName: context.user.name,
            actorAvatarId: context.user.avatarId,
            entityPreview: preview,
          },
        }).catch(console.error)
      }
    }
  }

  return post
}

export async function deletePost({
  data: postId,
  context,
}: {
  context: AuthenticatedContext
  data: DeletePostArgs
}) {
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
}
