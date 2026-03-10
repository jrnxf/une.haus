import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { chatMessages, postLikes, posts } from "~/db/schema"
import { getContributors, getStats } from "~/lib/stats/ops.server"
import {
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("stats integration", () => {
  it("getStats returns correct aggregate counts", async () => {
    const userA = await seedUser({ name: "User A" })
    const userB = await seedUser({ name: "User B" })
    await seedMuxVideo()

    // Seed posts
    await db.insert(posts).values([
      {
        title: "Post 1",
        content: "body",
        tags: ["street"],
        userId: userA.id,
      },
      {
        title: "Post 2",
        content: "body",
        tags: ["flatland"],
        userId: userB.id,
      },
    ])

    const postRows = await db.query.posts.findMany()

    // Seed likes
    await db.insert(postLikes).values({
      postId: postRows[0].id,
      userId: userB.id,
    })

    // Seed chat messages
    await db.insert(chatMessages).values({
      content: "hello",
      userId: userA.id,
    })

    const stats = await getStats()

    expect(stats.counts.users).toBe(2)
    expect(stats.counts.posts).toBe(2)
    expect(stats.counts.totalLikes).toBe(1)
    expect(stats.counts.totalMessages).toBe(1)
    expect(stats.counts.videoUploads).toBe(1)
  })

  it("getStats returns top contributors with correct scoring formula", async () => {
    const active = await seedUser({ name: "Active User" })
    const moderate = await seedUser({ name: "Moderate User" })

    // Active: 2 posts (content*5=10), 1 message (messages*2=2), 1 like (1) = 13 points
    await db.insert(posts).values([
      { title: "P1", content: "body", tags: ["street"], userId: active.id },
      { title: "P2", content: "body", tags: ["street"], userId: active.id },
    ])
    await db.insert(chatMessages).values({
      content: "hi",
      userId: active.id,
    })

    // Moderate: 1 post (5), 0 messages, 0 likes = 5 points (the like was by active, not moderate)
    const [modPost] = await db
      .insert(posts)
      .values({
        title: "P3",
        content: "body",
        tags: ["flatland"],
        userId: moderate.id,
      })
      .returning()
    await db.insert(postLikes).values({
      postId: modPost.id,
      userId: active.id,
    })

    const stats = await getStats()

    expect(stats.topContributors).toHaveLength(2)
    expect(stats.topContributors[0].id).toBe(active.id)
    expect(stats.topContributors[0].totalPoints).toBe(13)
    expect(stats.topContributors[1].id).toBe(moderate.id)
    expect(stats.topContributors[1].totalPoints).toBe(5)
  })

  it("getContributors excludes zero-point users", async () => {
    const active = await seedUser({ name: "Active" })
    await seedUser({ name: "Idle" })

    await db.insert(posts).values({
      title: "P1",
      content: "body",
      tags: ["street"],
      userId: active.id,
    })

    const contributors = await getContributors()

    expect(contributors).toHaveLength(1)
    expect(contributors[0].id).toBe(active.id)
    expect(contributors[0].totalPoints).toBe(5)
  })
})
