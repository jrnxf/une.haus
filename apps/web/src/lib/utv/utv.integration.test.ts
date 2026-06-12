import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { utvVideoLikes, utvVideoRiders, utvVideos } from "~/db/schema"
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
  it("listUtvVideos filters by text query", async () => {
    await seedUtvVideo({ title: "Kickflip Tutorial" })
    await seedUtvVideo({ title: "Unispin Guide" })
    await seedUtvVideo({ title: "Kickflip Compilation" })

    const { items } = await listUtvVideos({
      data: { q: "kickflip", sort: "oldest" },
    })

    expect(items).toHaveLength(2)
    expect(items.every((v) => v.title.toLowerCase().includes("kickflip"))).toBe(
      true,
    )
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

    const { items } = await listUtvVideos({
      data: { disciplines: ["flatland"], sort: "oldest" },
    })

    expect(items).toHaveLength(2)
    const titles = items.map((v) => v.title)
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
    expect(proResults.items).toHaveLength(1)
    expect(proResults.items[0].title).toBe("With Pro")

    // Filter by name-only rider
    const guestResults = await listUtvVideos({
      data: { riders: ["Guest Star"], sort: "oldest" },
    })
    expect(guestResults.items).toHaveLength(1)
    expect(guestResults.items[0].title).toBe("With Guest")
  })
})

// ==================== LIST PAGINATION ====================

const PAGE_SIZE = 25

// Seed N videos with deterministic titles "vid-000".."vid-NNN".
// Returns the seeded videos in insertion order (ascending id).
async function seedManyUtvVideos(count: number) {
  const videos: { id: number; title: string }[] = []
  for (let i = 0; i < count; i++) {
    const title = `vid-${String(i).padStart(3, "0")}`
    const video = await seedUtvVideo({ title })
    videos.push({ id: video.id, title: video.title })
  }
  return videos
}

async function seedLikes(utvVideoId: number, n: number) {
  for (let i = 0; i < n; i++) {
    const user = await seedUser({ name: `liker-${utvVideoId}-${i}` })
    await db.insert(utvVideoLikes).values({ utvVideoId, userId: user.id })
  }
}

describe("utv list pagination", () => {
  // Helper: request page 1 (no cursor) and page 2 (page 1's nextCursor).
  // Keyset pagination — page 2 is requested via the opaque cursor the server
  // returns, NOT a numeric offset. Row-content assertions below stay sort-only.
  async function getPages(sort: "engagement" | "newest" | "oldest") {
    const page1 = await listUtvVideos({ data: { sort } })
    const page2 = await listUtvVideos({
      data: { sort, cursor: page1.nextCursor },
    })
    return {
      page1Items: page1.items,
      page2Items: page2.items,
      page1HasNext: page1.nextCursor !== undefined,
      page2HasNext: page2.nextCursor !== undefined,
    }
  }

  it.each(["newest", "oldest", "engagement"] as const)(
    "paginates all rows across pages with no overlap or gaps (sort=%s)",
    async (sort) => {
      const total = PAGE_SIZE + 5
      await seedManyUtvVideos(total)

      const { page1Items, page2Items, page1HasNext, page2HasNext } =
        await getPages(sort)
      expect(page1Items).toHaveLength(PAGE_SIZE)
      expect(page1HasNext).toBe(true)
      expect(page2Items).toHaveLength(total - PAGE_SIZE)
      // Final page → no further cursor.
      expect(page2HasNext).toBe(false)

      const ids1 = page1Items.map((v) => v.id)
      const ids2 = page2Items.map((v) => v.id)

      // No overlap across the page boundary.
      const overlap = ids1.filter((id) => ids2.includes(id))
      expect(overlap).toEqual([])

      // No gaps: union covers every seeded id exactly once.
      const allIds = [...ids1, ...ids2].toSorted((a, b) => a - b)
      expect(allIds).toHaveLength(total)
      expect(new Set(allIds).size).toBe(total)

      // Order within each page matches the sort's expectation.
      if (sort === "oldest") {
        const asc = [...ids1, ...ids2]
        expect(asc).toEqual([...asc].toSorted((a, b) => a - b))
      } else if (sort === "newest") {
        const desc = [...ids1, ...ids2]
        expect(desc).toEqual([...desc].toSorted((a, b) => b - a))
      } else {
        // engagement: no likes seeded → all tie at 0, falls back to id DESC.
        const desc = [...ids1, ...ids2]
        expect(desc).toEqual([...desc].toSorted((a, b) => b - a))
      }
    },
  )

  it("engagement sort orders by like count desc, id desc tiebreaker", async () => {
    const videos = await seedManyUtvVideos(3)
    const [a, b, c] = videos
    // a: 5 likes, b: 5 likes (tie with a), c: 1 like
    await seedLikes(a.id, 5)
    await seedLikes(b.id, 5)
    await seedLikes(c.id, 1)

    const page = await listUtvVideos({ data: { sort: "engagement" } })
    const ids = page.items.map((v) => v.id)
    // a & b tie at 5 likes → higher id first (b before a). c last with 1 like.
    const higher = Math.max(a.id, b.id)
    const lower = Math.min(a.id, b.id)
    expect(ids).toEqual([higher, lower, c.id])
  })

  it("engagement sort paginates equal-like-count videos across a page boundary without duplication", async () => {
    // PAGE_SIZE + 1 videos all with the SAME like count (1). The id tiebreaker
    // must split them cleanly across the boundary with no overlap.
    const total = PAGE_SIZE + 1
    const videos = await seedManyUtvVideos(total)
    for (const v of videos) {
      await seedLikes(v.id, 1)
    }

    const page1 = await listUtvVideos({ data: { sort: "engagement" } })
    expect(page1.items).toHaveLength(PAGE_SIZE)
    expect(page1.nextCursor).toBeDefined()

    const page2 = await listUtvVideos({
      data: { sort: "engagement", cursor: page1.nextCursor },
    })
    expect(page2.items).toHaveLength(1)
    expect(page2.nextCursor).toBeUndefined()

    const ids1 = page1.items.map((v) => v.id)
    const ids2 = page2.items.map((v) => v.id)
    expect(ids1.filter((id) => ids2.includes(id))).toEqual([])
    expect(new Set([...ids1, ...ids2]).size).toBe(total)
    // All equal likes → pure id DESC across both pages.
    const combined = [...ids1, ...ids2]
    expect(combined).toEqual([...combined].toSorted((x, y) => y - x))
  })

  it("a malformed cursor behaves like no cursor (returns page 1)", async () => {
    const total = PAGE_SIZE + 5
    await seedManyUtvVideos(total)

    const clean = await listUtvVideos({ data: { sort: "newest" } })

    for (const bad of ["not-a-number", "12|34|56", "", "abc|def"]) {
      const result = await listUtvVideos({
        data: { sort: "newest", cursor: bad },
      })
      expect(result.items.map((v) => v.id)).toEqual(
        clean.items.map((v) => v.id),
      )
    }
  })
})
