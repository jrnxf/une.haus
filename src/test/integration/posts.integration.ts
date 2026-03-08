import { beforeEach, describe, expect, it } from "bun:test"

import {
  asUser,
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "./helpers"
import { db } from "~/db"
import {
  postLikes,
  postMessageLikes,
  postMessages,
  userFollows,
} from "~/db/schema"
import { createPostImpl, deletePostImpl, updatePostImpl } from "~/lib/posts/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("posts integration", () => {
  it("createPost persists media and fans out follower and mention notifications without self-mentioning", async () => {
    const author = await seedUser({ name: "Author" })
    const followerA = await seedUser({ name: "Follower A" })
    const followerB = await seedUser({ name: "Follower B" })
    const mentioned = await seedUser({ name: "Mentioned" })
    const video = await seedMuxVideo("post-video")

    await db.insert(userFollows).values([
      {
        followedByUserId: followerA.id,
        followedUserId: author.id,
      },
      {
        followedByUserId: followerB.id,
        followedUserId: author.id,
      },
    ])

    const post = await createPostImpl({
      ...asUser(author),
      data: {
        content: `hello @[${mentioned.id}] @[${author.id}]`,
        media: {
          type: "video",
          value: video.assetId,
        },
        tags: ["street"],
        title: "New Post",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(3)
    })

    const rereadPost = await db.query.posts.findFirst({
      where: (table, { eq }) => eq(table.id, post.id),
    })
    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rereadPost).toEqual(
      expect.objectContaining({
        id: post.id,
        imageId: null,
        muxAssetId: video.assetId,
        title: "New Post",
        youtubeVideoId: null,
      }),
    )
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: author.id,
          entityId: post.id,
          entityType: "post",
          type: "new_content",
          userId: followerA.id,
        }),
        expect.objectContaining({
          actorId: author.id,
          entityId: post.id,
          entityType: "post",
          type: "new_content",
          userId: followerB.id,
        }),
        expect.objectContaining({
          actorId: author.id,
          entityId: post.id,
          entityType: "post",
          type: "mention",
          userId: mentioned.id,
        }),
      ]),
    )
    expect(rows.find((row) => row.userId === author.id)).toBeUndefined()
  })

  it("updatePost only notifies newly added mentions", async () => {
    const author = await seedUser({ name: "Author" })
    const existingMention = await seedUser({ name: "Existing Mention" })
    const newMention = await seedUser({ name: "New Mention" })

    const post = await createPostImpl({
      ...asUser(author),
      data: {
        content: `hello @[${existingMention.id}]`,
        media: null,
        tags: ["til"],
        title: "Original Title",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(1)
    })

    await updatePostImpl({
      ...asUser(author),
      data: {
        content: `hello again @[${existingMention.id}] @[${newMention.id}] @[${author.id}]`,
        media: null,
        postId: post.id,
        tags: ["til"],
        title: "Updated Title",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(2)
    })

    const rereadPost = await db.query.posts.findFirst({
      where: (table, { eq }) => eq(table.id, post.id),
    })
    const mentionRows = await db.query.notifications.findMany({
      where: (table, { eq }) => eq(table.type, "mention"),
    })

    expect(rereadPost).toEqual(
      expect.objectContaining({
        content: `hello again @[${existingMention.id}] @[${newMention.id}] @[${author.id}]`,
        title: "Updated Title",
      }),
    )
    expect(
      mentionRows.filter((row) => row.userId === existingMention.id),
    ).toHaveLength(1)
    expect(
      mentionRows.filter((row) => row.userId === newMention.id),
    ).toHaveLength(1)
    expect(mentionRows.find((row) => row.userId === author.id)).toBeUndefined()
  })

  it("updatePost rejects non-owners", async () => {
    const owner = await seedUser({ name: "Owner" })
    const attacker = await seedUser({ name: "Attacker" })

    const post = await createPostImpl({
      ...asUser(owner),
      data: {
        content: "body",
        media: null,
        tags: ["memes"],
        title: "Locked Post",
      },
    })

    await expect(
      updatePostImpl({
        ...asUser(attacker),
        data: {
          content: "pwned",
          media: null,
          postId: post.id,
          tags: ["memes"],
          title: "Pwned",
        },
      }),
    ).rejects.toThrow("Access denied")
  })

  it("deletePost is owner-only and cascades dependent likes and messages", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const post = await createPostImpl({
      ...asUser(owner),
      data: {
        content: "body",
        media: null,
        tags: ["flatland"],
        title: "Delete Me",
      },
    })

    const [message] = await db
      .insert(postMessages)
      .values({
        content: "message",
        postId: post.id,
        userId: otherUser.id,
      })
      .returning()

    await db.insert(postLikes).values({
      postId: post.id,
      userId: otherUser.id,
    })
    await db.insert(postMessageLikes).values({
      postMessageId: message.id,
      userId: owner.id,
    })

    await expect(
      deletePostImpl({
        ...asUser(otherUser),
        data: post.id,
      }),
    ).rejects.toThrow("Access denied")

    await expect(
      deletePostImpl({
        ...asUser(owner),
        data: post.id,
      }),
    ).resolves.toEqual(expect.objectContaining({ id: post.id }))

    expect(await db.query.posts.findMany()).toHaveLength(0)
    expect(await db.query.postMessages.findMany()).toHaveLength(0)
    expect(await db.query.postLikes.findMany()).toHaveLength(0)
    expect(await db.query.postMessageLikes.findMany()).toHaveLength(0)
    expect(await db.query.notifications.findMany()).toHaveLength(0)
  })
})
