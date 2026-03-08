import { beforeEach, describe, expect, it } from "bun:test"

import { seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import {
  biuSets,
  bius,
  muxVideos,
  postMessages,
  posts,
  riuSets,
  riuSubmissions,
  rius,
  siuSets,
  sius,
  trickSubmissions,
  trickSuggestions,
  trickVideos,
  tricks,
  utvVideoSuggestions,
  utvVideos,
} from "~/db/schema"
import { getUserActivityImpl } from "~/lib/users/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedMux(assetId: string) {
  const [video] = await db
    .insert(muxVideos)
    .values({
      assetId,
      playbackId: `playback-${assetId}`,
    })
    .returning()

  return video
}

async function seedTrick(overrides: Partial<typeof tricks.$inferInsert> = {}) {
  const [trick] = await db
    .insert(tricks)
    .values({
      name: overrides.name ?? "Base Trick",
      slug: overrides.slug ?? `base-trick-${Date.now()}`,
      spin: overrides.spin ?? 0,
      ...overrides,
    })
    .returning()

  return trick
}

describe("users activity integration", () => {
  it("merges mixed activity newest-first, paginates by cursor, and excludes deleted BIU/SIU sets", async () => {
    const user = await seedUser({ name: "Activity User" })
    const trick = await seedTrick({
      name: "Activity Trick",
      slug: "activity-trick",
    })
    const [biu] = await db.insert(bius).values({}).returning()
    const [riu] = await db.insert(rius).values({ status: "active" }).returning()
    const [siu] = await db.insert(sius).values({ status: "active" }).returning()
    const postVideo = await seedMux("post-video")
    const riuSetVideo = await seedMux("riu-set-video")
    const riuSubmissionVideo = await seedMux("riu-submission-video")
    const biuActiveVideo = await seedMux("biu-active-video")
    const biuDeletedVideo = await seedMux("biu-deleted-video")
    const siuActiveVideo = await seedMux("siu-active-video")
    const siuDeletedVideo = await seedMux("siu-deleted-video")
    const trickVideoAsset = await seedMux("trick-video")
    const utvMux = await seedMux("utv-video")

    const [post] = await db
      .insert(posts)
      .values({
        content: "post body",
        createdAt: new Date("2024-01-01T12:00:00Z"),
        muxAssetId: postVideo.assetId,
        title: "Activity Post",
        userId: user.id,
      })
      .returning()

    await db.insert(postMessages).values({
      content: "post comment",
      createdAt: new Date("2024-01-01T12:01:00Z"),
      postId: post.id,
      userId: user.id,
    })

    const [riuSet] = await db
      .insert(riuSets)
      .values({
        createdAt: new Date("2024-01-01T12:02:00Z"),
        instructions: "riu instructions",
        muxAssetId: riuSetVideo.assetId,
        name: "RIU Set",
        riuId: riu.id,
        userId: user.id,
      })
      .returning()

    await db.insert(riuSubmissions).values({
      createdAt: new Date("2024-01-01T12:03:00Z"),
      muxAssetId: riuSubmissionVideo.assetId,
      riuSetId: riuSet.id,
      userId: user.id,
    })

    await db.insert(biuSets).values([
      {
        biuId: biu.id,
        createdAt: new Date("2024-01-01T12:04:00Z"),
        deletedAt: new Date("2024-01-01T12:20:00Z"),
        muxAssetId: biuDeletedVideo.assetId,
        name: "Deleted BIU Set",
        parentSetId: null,
        position: 1,
        userId: user.id,
      },
      {
        biuId: biu.id,
        createdAt: new Date("2024-01-01T12:05:00Z"),
        muxAssetId: biuActiveVideo.assetId,
        name: "Active BIU Set",
        parentSetId: null,
        position: 2,
        userId: user.id,
      },
    ])

    await db.insert(siuSets).values([
      {
        createdAt: new Date("2024-01-01T12:06:00Z"),
        deletedAt: new Date("2024-01-01T12:21:00Z"),
        muxAssetId: siuDeletedVideo.assetId,
        name: "Deleted SIU Set",
        parentSetId: null,
        position: 1,
        siuId: siu.id,
        userId: user.id,
      },
      {
        createdAt: new Date("2024-01-01T12:07:00Z"),
        muxAssetId: siuActiveVideo.assetId,
        name: "Active SIU Set",
        parentSetId: null,
        position: 2,
        siuId: siu.id,
        userId: user.id,
      },
    ])

    await db.insert(trickSubmissions).values({
      createdAt: new Date("2024-01-01T12:08:00Z"),
      name: "Trick Submission",
      slug: "trick-submission",
      submittedByUserId: user.id,
    })

    await db.insert(trickSuggestions).values({
      createdAt: new Date("2024-01-01T12:09:00Z"),
      diff: { notes: "suggestion" },
      submittedByUserId: user.id,
      trickId: trick.id,
    })

    await db.insert(trickVideos).values({
      createdAt: new Date("2024-01-01T12:10:00Z"),
      muxAssetId: trickVideoAsset.assetId,
      status: "pending",
      submittedByUserId: user.id,
      trickId: trick.id,
    })

    const [utvVideo] = await db
      .insert(utvVideos)
      .values({
        legacyTitle: "Legacy Video",
        legacyUrl: "https://example.com/legacy.mp4",
        muxAssetId: utvMux.assetId,
        title: "UTV Video",
      })
      .returning()

    await db.insert(utvVideoSuggestions).values({
      createdAt: new Date("2024-01-01T12:11:00Z"),
      diff: { title: "Updated UTV Title" },
      submittedByUserId: user.id,
      utvVideoId: utvVideo.id,
    })

    const firstPage = await getUserActivityImpl({
      data: {
        limit: 5,
        userId: user.id,
      },
    })

    expect(firstPage.items.map((item) => item.type)).toEqual([
      "utvVideoSuggestion",
      "trickVideo",
      "trickSuggestion",
      "trickSubmission",
      "siuSet",
    ])
    expect(firstPage.nextCursor).toBeDefined()

    const secondPage = await getUserActivityImpl({
      data: {
        cursor: firstPage.nextCursor,
        limit: 5,
        userId: user.id,
      },
    })

    expect(secondPage.items.map((item) => item.type)).toEqual([
      "biuSet",
      "riuSubmission",
      "riuSet",
      "comment",
      "post",
    ])
    expect(
      [...firstPage.items, ...secondPage.items].map((item) => item.type),
    ).toEqual([
      "utvVideoSuggestion",
      "trickVideo",
      "trickSuggestion",
      "trickSubmission",
      "siuSet",
      "biuSet",
      "riuSubmission",
      "riuSet",
      "comment",
      "post",
    ])
  })

  it("supports type filtering and returns joined parent metadata for comments", async () => {
    const user = await seedUser({ name: "Activity User" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "post body",
        createdAt: new Date("2024-01-02T12:00:00Z"),
        title: "Joined Parent Post",
        userId: user.id,
      })
      .returning()

    await db.insert(postMessages).values({
      content: "comment body",
      createdAt: new Date("2024-01-02T12:01:00Z"),
      postId: post.id,
      userId: user.id,
    })

    const activity = await getUserActivityImpl({
      data: {
        limit: 10,
        type: "comment",
        userId: user.id,
      },
    })

    expect(activity.items).toEqual([
      expect.objectContaining({
        content: "comment body",
        parentId: post.id,
        parentTitle: "Joined Parent Post",
        parentType: "post",
        type: "comment",
      }),
    ])
    expect(activity.nextCursor).toBeUndefined()
  })
})
