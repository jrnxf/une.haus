import { beforeEach, describe, expect, it } from "bun:test"

import { asUser, seedUser, truncatePublicTables, waitFor } from "./helpers"
import { db } from "~/db"
import { postLikes, posts } from "~/db/schema"
import { likeRecordImpl, unlikeRecordImpl } from "~/lib/reactions/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("reactions integration", () => {
  it("likeRecord inserts a like row and notifies the owner for primary content", async () => {
    const owner = await seedUser({ name: "Owner" })
    const liker = await seedUser({ name: "Liker" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Test post",
        userId: owner.id,
      })
      .returning()

    await likeRecordImpl({
      ...asUser(liker),
      data: {
        recordId: post.id,
        type: "post",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(1)
    })

    expect(await db.query.postLikes.findMany()).toEqual([
      expect.objectContaining({
        postId: post.id,
        userId: liker.id,
      }),
    ])
    expect(await db.query.notifications.findMany()).toEqual([
      expect.objectContaining({
        actorId: liker.id,
        entityId: post.id,
        entityType: "post",
        type: "like",
        userId: owner.id,
      }),
    ])
  })

  it("likeRecord suppresses self-like notifications while still inserting the row", async () => {
    const owner = await seedUser({ name: "Owner" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Self Like",
        userId: owner.id,
      })
      .returning()

    await likeRecordImpl({
      ...asUser(owner),
      data: {
        recordId: post.id,
        type: "post",
      },
    })

    expect(await db.query.postLikes.findMany()).toEqual([
      expect.objectContaining({
        postId: post.id,
        userId: owner.id,
      }),
    ])
    expect(await db.query.notifications.findMany()).toHaveLength(0)
  })

  it("unlikeRecord deletes only the acting user's like row", async () => {
    const owner = await seedUser({ name: "Owner" })
    const liker = await seedUser({ name: "Liker" })
    const otherLiker = await seedUser({ name: "Other Liker" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Unlike Me",
        userId: owner.id,
      })
      .returning()

    await db.insert(postLikes).values([
      {
        postId: post.id,
        userId: liker.id,
      },
      {
        postId: post.id,
        userId: otherLiker.id,
      },
    ])

    await unlikeRecordImpl({
      ...asUser(liker),
      data: {
        recordId: post.id,
        type: "post",
      },
    })

    expect(await db.query.postLikes.findMany()).toEqual([
      expect.objectContaining({
        postId: post.id,
        userId: otherLiker.id,
      }),
    ])
  })
})
