import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { utvVideoRiders, utvVideos } from "~/db/schema"
import {
  adminUpdateUtvVideo,
  createUtvSuggestion,
  listUtvVideos,
  reviewUtvSuggestion,
  updateUtvThumbnailSeconds,
  updateUtvTitle,
} from "~/lib/utv/ops.server"
import {
  asUser,
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedUtvVideo(
  overrides: Partial<typeof utvVideos.$inferInsert> = {},
) {
  const muxVideo = await seedMuxVideo()
  const [video] = await db
    .insert(utvVideos)
    .values({
      legacyUrl: overrides.legacyUrl ?? "https://example.com/video",
      legacyTitle: overrides.legacyTitle ?? "Legacy Title",
      title: overrides.title ?? "Test Video",
      muxAssetId: muxVideo.assetId,
      ...overrides,
    })
    .returning()
  return video
}

// ==================== SUGGESTIONS ====================

describe("utv suggestions", () => {
  it("createUtvSuggestion creates a pending suggestion for an existing video", async () => {
    const user = await seedUser({ name: "Suggester" })
    const video = await seedUtvVideo({ title: "Original Title" })

    const suggestion = await createUtvSuggestion({
      ...asUser(user),
      data: {
        utvVideoId: video.id,
        diff: { title: "Better Title" },
        reason: "more descriptive",
      },
    })

    expect(suggestion).toEqual(
      expect.objectContaining({
        utvVideoId: video.id,
        diff: { title: "Better Title" },
        reason: "more descriptive",
        status: "pending",
        submittedByUserId: user.id,
      }),
    )
  })

  it("createUtvSuggestion rejects a nonexistent video", async () => {
    const user = await seedUser({ name: "Suggester" })

    await expect(
      createUtvSuggestion({
        ...asUser(user),
        data: {
          utvVideoId: 9999,
          diff: { title: "Nope" },
        },
      }),
    ).rejects.toThrow("Video not found")
  })

  it("reviewUtvSuggestion approval applies the diff and notifies the submitter", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const riderUser = await seedUser({ name: "Rider One" })
    const video = await seedUtvVideo({
      title: "Old Title",
      disciplines: ["street"],
    })

    const suggestion = await createUtvSuggestion({
      ...asUser(submitter),
      data: {
        utvVideoId: video.id,
        diff: {
          title: "New Title",
          disciplines: ["flatland", "freestyle"],
          riders: [
            { userId: riderUser.id, name: null },
            { userId: null, name: "Guest Rider" },
          ],
        },
        reason: "full update",
      },
    })

    const result = await reviewUtvSuggestion({
      ...asUser(admin),
      data: {
        id: suggestion.id,
        status: "approved",
        reviewNotes: "looks good",
      },
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: suggestion.id,
        status: "approved",
        reviewedByUserId: admin.id,
        reviewNotes: "looks good",
      }),
    )
    expect(result.reviewedAt).toBeInstanceOf(Date)

    // Verify diff was applied to video
    const updatedVideo = await db.query.utvVideos.findFirst({
      where: (table, { eq }) => eq(table.id, video.id),
    })
    expect(updatedVideo).toEqual(
      expect.objectContaining({
        title: "New Title",
        disciplines: ["flatland", "freestyle"],
      }),
    )

    // Verify riders were replaced
    const riders = await db.query.utvVideoRiders.findMany({
      where: (table, { eq }) => eq(table.utvVideoId, video.id),
      orderBy: (table, { asc }) => [asc(table.order)],
    })
    expect(riders).toHaveLength(2)
    expect(riders[0]).toEqual(
      expect.objectContaining({ userId: riderUser.id, name: null, order: 0 }),
    )
    expect(riders[1]).toEqual(
      expect.objectContaining({ userId: null, name: "Guest Rider", order: 1 }),
    )

    // Verify notification
    await waitFor(async () => {
      const notifications = await db.query.notifications.findMany()
      expect(notifications).toEqual([
        expect.objectContaining({
          actorId: admin.id,
          entityId: suggestion.id,
          entityType: "utvVideoSuggestion",
          type: "review",
          userId: submitter.id,
        }),
      ])
    })
  })

  it("reviewUtvSuggestion approval with partial diff only updates provided fields", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const video = await seedUtvVideo({
      title: "Keep This Title",
      disciplines: ["trials"],
    })

    // Add existing riders
    await db.insert(utvVideoRiders).values([
      {
        utvVideoId: video.id,
        userId: null,
        name: "Existing Rider",
        order: 0,
      },
    ])

    const suggestion = await createUtvSuggestion({
      ...asUser(submitter),
      data: {
        utvVideoId: video.id,
        diff: { title: "Updated Title" },
        reason: "title only",
      },
    })

    await reviewUtvSuggestion({
      ...asUser(admin),
      data: {
        id: suggestion.id,
        status: "approved",
        reviewNotes: "title change only",
      },
    })

    const updatedVideo = await db.query.utvVideos.findFirst({
      where: (table, { eq }) => eq(table.id, video.id),
    })
    expect(updatedVideo).toEqual(
      expect.objectContaining({
        title: "Updated Title",
        disciplines: ["trials"],
      }),
    )

    // Riders should be untouched since diff had no riders key
    const riders = await db.query.utvVideoRiders.findMany({
      where: (table, { eq }) => eq(table.utvVideoId, video.id),
    })
    expect(riders).toHaveLength(1)
    expect(riders[0]).toEqual(
      expect.objectContaining({ name: "Existing Rider" }),
    )
  })

  it("reviewUtvSuggestion rejection leaves the video unchanged and notifies the submitter", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const video = await seedUtvVideo({
      title: "Unchanged Title",
      disciplines: ["mountain"],
    })

    const suggestion = await createUtvSuggestion({
      ...asUser(submitter),
      data: {
        utvVideoId: video.id,
        diff: { title: "Rejected Title", disciplines: ["street"] },
        reason: "nah",
      },
    })

    await reviewUtvSuggestion({
      ...asUser(admin),
      data: {
        id: suggestion.id,
        status: "rejected",
        reviewNotes: "not this time",
      },
    })

    const unchangedVideo = await db.query.utvVideos.findFirst({
      where: (table, { eq }) => eq(table.id, video.id),
    })
    expect(unchangedVideo).toEqual(
      expect.objectContaining({
        title: "Unchanged Title",
        disciplines: ["mountain"],
      }),
    )

    await waitFor(async () => {
      const notifications = await db.query.notifications.findMany()
      expect(notifications).toEqual([
        expect.objectContaining({
          entityType: "utvVideoSuggestion",
          type: "review",
          userId: submitter.id,
        }),
      ])
    })
  })

  it("reviewUtvSuggestion rejects double review", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const submitter = await seedUser({ name: "Submitter" })
    const video = await seedUtvVideo()

    const suggestion = await createUtvSuggestion({
      ...asUser(submitter),
      data: {
        utvVideoId: video.id,
        diff: { title: "Something" },
      },
    })

    await reviewUtvSuggestion({
      ...asUser(admin),
      data: {
        id: suggestion.id,
        status: "rejected",
        reviewNotes: "nope",
      },
    })

    await expect(
      reviewUtvSuggestion({
        ...asUser(admin),
        data: {
          id: suggestion.id,
          status: "approved",
          reviewNotes: "second attempt",
        },
      }),
    ).rejects.toThrow("Suggestion already reviewed")
  })
})

// ==================== ADMIN OPS ====================

describe("utv admin ops", () => {
  it("adminUpdateUtvVideo updates all fields and replaces riders", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const riderA = await seedUser({ name: "Rider A" })
    const video = await seedUtvVideo({
      title: "Old Title",
      disciplines: ["street"],
      thumbnailScale: 1,
      thumbnailSeconds: 10,
    })

    // Seed existing riders
    await db
      .insert(utvVideoRiders)
      .values([
        { utvVideoId: video.id, userId: null, name: "Old Rider", order: 0 },
      ])

    await adminUpdateUtvVideo({
      ...asUser(admin),
      data: {
        id: video.id,
        title: "New Title",
        disciplines: ["flatland", "trials"],
        thumbnailScale: 2,
        thumbnailSeconds: 45,
        riders: [
          { userId: riderA.id, name: null },
          { userId: null, name: "New Guest" },
        ],
      },
    })

    const updated = await db.query.utvVideos.findFirst({
      where: (table, { eq }) => eq(table.id, video.id),
    })
    expect(updated).toEqual(
      expect.objectContaining({
        title: "New Title",
        disciplines: ["flatland", "trials"],
        thumbnailScale: 2,
        thumbnailSeconds: 45,
      }),
    )

    const riders = await db.query.utvVideoRiders.findMany({
      where: (table, { eq }) => eq(table.utvVideoId, video.id),
      orderBy: (table, { asc }) => [asc(table.order)],
    })
    expect(riders).toHaveLength(2)
    expect(riders[0]).toEqual(
      expect.objectContaining({ userId: riderA.id, order: 0 }),
    )
    expect(riders[1]).toEqual(
      expect.objectContaining({ name: "New Guest", order: 1 }),
    )
  })

  it("updateUtvTitle updates only the title", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const video = await seedUtvVideo({
      title: "Before",
      thumbnailSeconds: 20,
    })

    const result = await updateUtvTitle({
      ...asUser(admin),
      data: { id: video.id, title: "After" },
    })

    expect(result).toEqual({ id: video.id, title: "After" })

    const updated = await db.query.utvVideos.findFirst({
      where: (table, { eq }) => eq(table.id, video.id),
    })
    expect(updated).toEqual(
      expect.objectContaining({
        title: "After",
        thumbnailSeconds: 20,
      }),
    )
  })

  it("updateUtvThumbnailSeconds updates only the thumbnail seconds", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const video = await seedUtvVideo({
      title: "Stays Same",
      thumbnailSeconds: 10,
    })

    const result = await updateUtvThumbnailSeconds({
      ...asUser(admin),
      data: { id: video.id, thumbnailSeconds: 55 },
    })

    expect(result).toEqual({ id: video.id, thumbnailSeconds: 55 })

    const updated = await db.query.utvVideos.findFirst({
      where: (table, { eq }) => eq(table.id, video.id),
    })
    expect(updated).toEqual(
      expect.objectContaining({
        title: "Stays Same",
        thumbnailSeconds: 55,
      }),
    )
  })
})

// ==================== LIST FILTERING ====================

describe("utv list filtering", () => {
  it("listUtvVideos paginates by offset", async () => {
    await seedUtvVideo({ title: "Video 1" })
    await seedUtvVideo({ title: "Video 2" })
    await seedUtvVideo({ title: "Video 3" })

    const page1 = await listUtvVideos({
      data: { sort: "oldest" },
    })
    expect(page1.length).toBeGreaterThanOrEqual(3)

    const page2 = await listUtvVideos({
      data: { cursor: 2, sort: "oldest" },
    })
    // Offset 2 skips the first 2
    expect(page2.every((v) => !["Video 1", "Video 2"].includes(v.title))).toBe(
      page2.length > 0,
    )
  })

  it("listUtvVideos filters by text query", async () => {
    await seedUtvVideo({ title: "Kickflip Tutorial" })
    await seedUtvVideo({ title: "Unispin Guide" })
    await seedUtvVideo({ title: "Kickflip Compilation" })

    const results = await listUtvVideos({
      data: { q: "kickflip", sort: "oldest" },
    })

    expect(results).toHaveLength(2)
    expect(
      results.every((v) => v.title.toLowerCase().includes("kickflip")),
    ).toBe(true)
  })

  it("listUtvVideos filters by disciplines", async () => {
    await seedUtvVideo({ title: "Street Vid", disciplines: ["street"] })
    await seedUtvVideo({
      title: "Flat Vid",
      disciplines: ["flatland"],
    })
    await seedUtvVideo({
      title: "Both",
      disciplines: ["street", "flatland"],
    })

    const results = await listUtvVideos({
      data: { disciplines: ["flatland"], sort: "oldest" },
    })

    expect(results).toHaveLength(2)
    const titles = results.map((v) => v.title)
    expect(titles).toContain("Flat Vid")
    expect(titles).toContain("Both")
  })

  it("listUtvVideos filters by riders", async () => {
    const riderUser = await seedUser({ name: "Pro Rider" })
    const video1 = await seedUtvVideo({ title: "With Pro" })
    const video2 = await seedUtvVideo({ title: "With Guest" })
    await seedUtvVideo({ title: "No Riders" })

    await db.insert(utvVideoRiders).values([
      { utvVideoId: video1.id, userId: riderUser.id, name: null, order: 0 },
      { utvVideoId: video2.id, userId: null, name: "Guest Star", order: 0 },
    ])

    // Filter by user-linked rider
    const proResults = await listUtvVideos({
      data: { riders: ["Pro Rider"], sort: "oldest" },
    })
    expect(proResults).toHaveLength(1)
    expect(proResults[0].title).toBe("With Pro")

    // Filter by name-only rider
    const guestResults = await listUtvVideos({
      data: { riders: ["Guest Star"], sort: "oldest" },
    })
    expect(guestResults).toHaveLength(1)
    expect(guestResults[0].title).toBe("With Guest")
  })
})
