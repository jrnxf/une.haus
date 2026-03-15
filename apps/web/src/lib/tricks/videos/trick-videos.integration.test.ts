import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { trickVideos, tricks } from "~/db/schema"
import {
  demoteVideo,
  reorderVideos,
  reviewVideo,
  submitVideo,
} from "~/lib/tricks/videos/ops.server"
import {
  asUser,
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedTrick(overrides: Partial<typeof tricks.$inferInsert> = {}) {
  const [trick] = await db
    .insert(tricks)
    .values({
      name: overrides.name ?? "Base Trick",
      ...overrides,
    })
    .returning()

  return trick
}

describe("trick videos integration", () => {
  it("submitVideo requires an existing trick and creates a pending row", async () => {
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      name: "Video Trick",
    })
    const video = await seedMuxVideo("video-submit")

    const submitted = await submitVideo({
      ...asUser(submitter),
      data: {
        muxAssetId: video.assetId,
        notes: "good clip",
        trickId: trick.id,
      },
    })

    await expect(
      submitVideo({
        ...asUser(submitter),
        data: {
          muxAssetId: video.assetId,
          notes: null,
          trickId: 9999,
        },
      }),
    ).rejects.toThrow("Trick not found")

    expect(submitted).toEqual(
      expect.objectContaining({
        muxAssetId: video.assetId,
        notes: "good clip",
        status: "pending",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      }),
    )
  })

  it("reviewVideo approval assigns the next sort order, sets review metadata, and notifies the submitter", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const reviewerVideo = await seedMuxVideo("video-approve-pending")
    const activeVideoA = await seedMuxVideo("video-approve-active-a")
    const activeVideoB = await seedMuxVideo("video-approve-active-b")
    const trick = await seedTrick({
      name: "Approve Trick",
    })

    await db.insert(trickVideos).values([
      {
        muxAssetId: activeVideoA.assetId,
        sortOrder: 0,
        status: "active",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      },
      {
        muxAssetId: activeVideoB.assetId,
        sortOrder: 1,
        status: "active",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      },
    ])

    const [pendingVideo] = await db
      .insert(trickVideos)
      .values({
        muxAssetId: reviewerVideo.assetId,
        notes: "please approve",
        status: "pending",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      })
      .returning()

    const updated = await reviewVideo({
      ...asUser(admin),
      data: {
        id: pendingVideo.id,
        reviewNotes: "approved",
        status: "active",
      },
    })

    const rows = await db.query.notifications.findMany()

    expect(updated).toEqual(
      expect.objectContaining({
        id: pendingVideo.id,
        reviewedByUserId: admin.id,
        sortOrder: 2,
        status: "active",
      }),
    )
    expect(updated.reviewedAt).toBeInstanceOf(Date)
    expect(rows).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        entityId: pendingVideo.id,
        entityType: "trickVideo",
        type: "review",
        userId: submitter.id,
      }),
    ])
  })

  it("reviewVideo reject path updates status and review metadata and notifies the submitter", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const muxVideo = await seedMuxVideo("video-reject")
    const trick = await seedTrick({
      name: "Reject Trick",
    })

    const [pendingVideo] = await db
      .insert(trickVideos)
      .values({
        muxAssetId: muxVideo.assetId,
        status: "pending",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      })
      .returning()

    const updated = await reviewVideo({
      ...asUser(admin),
      data: {
        id: pendingVideo.id,
        reviewNotes: "not enough quality",
        status: "rejected",
      },
    })

    const rows = await db.query.notifications.findMany()

    expect(updated).toEqual(
      expect.objectContaining({
        id: pendingVideo.id,
        reviewedByUserId: admin.id,
        status: "rejected",
      }),
    )
    expect(updated.reviewedAt).toBeInstanceOf(Date)
    expect(rows).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        entityId: pendingVideo.id,
        entityType: "trickVideo",
        type: "review",
        userId: submitter.id,
      }),
    ])
  })

  it("reviewVideo enforces the maximum number of active videos", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      name: "Capped Trick",
    })

    for (const [index, assetId] of [
      "video-cap-0",
      "video-cap-1",
      "video-cap-2",
      "video-cap-3",
      "video-cap-4",
    ].entries()) {
      const video = await seedMuxVideo(assetId)
      await db.insert(trickVideos).values({
        muxAssetId: video.assetId,
        sortOrder: index,
        status: "active",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      })
    }

    const pendingMux = await seedMuxVideo("video-cap-pending")
    const [pendingVideo] = await db
      .insert(trickVideos)
      .values({
        muxAssetId: pendingMux.assetId,
        status: "pending",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      })
      .returning()

    await expect(
      reviewVideo({
        ...asUser(admin),
        data: {
          id: pendingVideo.id,
          reviewNotes: "too many",
          status: "active",
        },
      }),
    ).rejects.toThrow(
      "Cannot have more than 5 active videos. Demote one first.",
    )
  })

  it("reorderVideos persists the requested active sort order", async () => {
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      name: "Reorder Trick",
    })
    const videoA = await seedMuxVideo("video-reorder-a")
    const videoB = await seedMuxVideo("video-reorder-b")
    const videoC = await seedMuxVideo("video-reorder-c")

    const [rowA, rowB, rowC] = await db
      .insert(trickVideos)
      .values([
        {
          muxAssetId: videoA.assetId,
          sortOrder: 0,
          status: "active",
          submittedByUserId: submitter.id,
          trickId: trick.id,
        },
        {
          muxAssetId: videoB.assetId,
          sortOrder: 1,
          status: "active",
          submittedByUserId: submitter.id,
          trickId: trick.id,
        },
        {
          muxAssetId: videoC.assetId,
          sortOrder: 2,
          status: "active",
          submittedByUserId: submitter.id,
          trickId: trick.id,
        },
      ])
      .returning()

    await expect(
      reorderVideos({
        data: {
          trickId: trick.id,
          videoIds: [rowC.id, rowA.id, rowB.id],
        },
      }),
    ).resolves.toEqual({ success: true })

    const rows = await db.query.trickVideos.findMany({
      where: (table, { eq }) => eq(table.trickId, trick.id),
      orderBy: (table, { asc }) => [asc(table.sortOrder)],
    })

    expect(
      rows.map((row) => ({ id: row.id, sortOrder: row.sortOrder })),
    ).toEqual([
      { id: rowC.id, sortOrder: 0 },
      { id: rowA.id, sortOrder: 1 },
      { id: rowB.id, sortOrder: 2 },
    ])
  })

  it("reorderVideos rejects non-active videos", async () => {
    const submitter = await seedUser({ name: "Submitter" })
    const trick = await seedTrick({
      name: "Validation Trick",
    })
    const activeMux = await seedMuxVideo("video-validation-active")
    const pendingMux = await seedMuxVideo("video-validation-pending")

    const [activeVideo, pendingVideo] = await db
      .insert(trickVideos)
      .values([
        {
          muxAssetId: activeMux.assetId,
          sortOrder: 0,
          status: "active",
          submittedByUserId: submitter.id,
          trickId: trick.id,
        },
        {
          muxAssetId: pendingMux.assetId,
          status: "pending",
          submittedByUserId: submitter.id,
          trickId: trick.id,
        },
      ])
      .returning()

    await expect(
      reorderVideos({
        data: {
          trickId: trick.id,
          videoIds: [activeVideo.id, pendingVideo.id],
        },
      }),
    ).rejects.toThrow(`Video ${pendingVideo.id} is not active for this trick`)
  })

  it("demoteVideo moves an active video back to pending and resets sort order", async () => {
    const submitter = await seedUser({ name: "Submitter" })
    const muxVideo = await seedMuxVideo("video-demote")
    const trick = await seedTrick({
      name: "Demote Trick",
    })

    const [video] = await db
      .insert(trickVideos)
      .values({
        muxAssetId: muxVideo.assetId,
        sortOrder: 4,
        status: "active",
        submittedByUserId: submitter.id,
        trickId: trick.id,
      })
      .returning()

    const updated = await demoteVideo({
      data: {
        id: video.id,
      },
    })

    expect(updated).toEqual(
      expect.objectContaining({
        id: video.id,
        sortOrder: 0,
        status: "pending",
      }),
    )
  })
})
