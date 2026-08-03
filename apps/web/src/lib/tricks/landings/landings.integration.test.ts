import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  muxVideos,
  trickVideos,
  tricks,
  utvVideoRiders,
  utvVideos,
} from "~/db/schema"
import {
  landTrick,
  landingCounts,
  landingsForUser,
  unlandTrick,
  vaultVideosForUser,
} from "~/lib/tricks/landings/ops.server"
import {
  asUser,
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedTrick(name: string) {
  const [trick] = await db.insert(tricks).values({ name }).returning()
  return trick
}

async function seedTrickVideo({
  trickId,
  userId,
  status,
  createdAt,
}: {
  trickId: number
  userId: number
  status: "active" | "pending" | "rejected"
  createdAt?: Date
}) {
  const video = await seedMuxVideo()
  const [row] = await db
    .insert(trickVideos)
    .values({
      muxAssetId: video.assetId,
      status,
      submittedByUserId: userId,
      trickId,
      ...(createdAt ? { createdAt } : {}),
    })
    .returning()
  return row
}

describe("landings integration", () => {
  it("pending and active videos count as landings; rejected does not", async () => {
    const rider = await seedUser({ name: "Rider" })
    const pendingTrick = await seedTrick("Pending Trick")
    const activeTrick = await seedTrick("Active Trick")
    const rejectedTrick = await seedTrick("Rejected Trick")

    await seedTrickVideo({
      trickId: pendingTrick.id,
      userId: rider.id,
      status: "pending",
    })
    await seedTrickVideo({
      trickId: activeTrick.id,
      userId: rider.id,
      status: "active",
    })
    await seedTrickVideo({
      trickId: rejectedTrick.id,
      userId: rider.id,
      status: "rejected",
    })

    const landings = await landingsForUser(rider.id)

    expect(landings.map((l) => l.trickId).toSorted()).toEqual(
      [pendingTrick.id, activeTrick.id].toSorted(),
    )
    expect(landings.find((l) => l.trickId === pendingTrick.id)?.status).toBe(
      "pending",
    )
    expect(landings.find((l) => l.trickId === activeTrick.id)?.status).toBe(
      "active",
    )
  })

  it("multiple videos on one trick reduce to a single landing where active wins", async () => {
    const rider = await seedUser({ name: "Rider" })
    const trick = await seedTrick("Multi Video Trick")

    const earlier = new Date("2026-01-01T00:00:00Z")
    const later = new Date("2026-02-01T00:00:00Z")

    const pendingRow = await seedTrickVideo({
      trickId: trick.id,
      userId: rider.id,
      status: "pending",
      createdAt: earlier,
    })
    const activeRow = await seedTrickVideo({
      trickId: trick.id,
      userId: rider.id,
      status: "active",
      createdAt: later,
    })

    const landings = await landingsForUser(rider.id)

    expect(landings).toHaveLength(1)
    expect(landings[0]).toEqual({
      trickId: trick.id,
      status: "active",
      videoIds: [pendingRow.id, activeRow.id],
      firstLandedAt: earlier,
    })
  })

  it("only returns the requested user's landings", async () => {
    const rider = await seedUser({ name: "Rider" })
    const other = await seedUser({ name: "Other" })
    const trick = await seedTrick("Shared Trick")
    const otherTrick = await seedTrick("Other Trick")

    await seedTrickVideo({
      trickId: trick.id,
      userId: rider.id,
      status: "pending",
    })
    await seedTrickVideo({
      trickId: otherTrick.id,
      userId: other.id,
      status: "active",
    })

    const landings = await landingsForUser(rider.id)

    expect(landings).toHaveLength(1)
    expect(landings[0]?.trickId).toBe(trick.id)
  })

  it("a user with no landings gets an empty list", async () => {
    const rider = await seedUser({ name: "Rider" })
    expect(await landingsForUser(rider.id)).toEqual([])
  })

  it("landingCounts counts distinct riders per trick, excluding rejected", async () => {
    const riderA = await seedUser({ name: "Rider A" })
    const riderB = await seedUser({ name: "Rider B" })
    const riderC = await seedUser({ name: "Rider C" })
    const popular = await seedTrick("Popular Trick")
    const niche = await seedTrick("Niche Trick")
    const unlanded = await seedTrick("Unlanded Trick")

    // Rider A has two videos on the same trick — counts once.
    await seedTrickVideo({
      trickId: popular.id,
      userId: riderA.id,
      status: "pending",
    })
    await seedTrickVideo({
      trickId: popular.id,
      userId: riderA.id,
      status: "active",
    })
    await seedTrickVideo({
      trickId: popular.id,
      userId: riderB.id,
      status: "pending",
    })
    // Rejected videos never count.
    await seedTrickVideo({
      trickId: popular.id,
      userId: riderC.id,
      status: "rejected",
    })
    await seedTrickVideo({
      trickId: niche.id,
      userId: riderB.id,
      status: "active",
    })

    const counts = await landingCounts()
    const byTrick = new Map(counts.map((c) => [c.trickId, c.riders]))

    expect(byTrick.get(popular.id)).toBe(2)
    expect(byTrick.get(niche.id)).toBe(1)
    expect(byTrick.has(unlanded.id)).toBe(false)
  })

  it("landTrick creates a pending video row for the rider", async () => {
    const rider = await seedUser({ name: "Rider" })
    const trick = await seedTrick("Land Trick")
    const video = await seedMuxVideo()

    const row = await landTrick({
      ...asUser(rider),
      data: {
        trickId: trick.id,
        muxAssetId: video.assetId,
        notes: null,
        confirmedSingleTrick: true,
      },
    })

    expect(row).toEqual(
      expect.objectContaining({
        trickId: trick.id,
        muxAssetId: video.assetId,
        status: "pending",
        submittedByUserId: rider.id,
      }),
    )
  })

  it("unlandTrick deletes own non-rejected rows and the unshared mux asset", async () => {
    const rider = await seedUser({ name: "Rider" })
    const other = await seedUser({ name: "Other" })
    const trick = await seedTrick("Unland Trick")

    const own = await seedTrickVideo({
      trickId: trick.id,
      userId: rider.id,
      status: "pending",
    })
    const rejected = await seedTrickVideo({
      trickId: trick.id,
      userId: rider.id,
      status: "rejected",
    })
    const others = await seedTrickVideo({
      trickId: trick.id,
      userId: other.id,
      status: "active",
    })

    const deletedAssets: string[] = []
    const result = await unlandTrick({
      ...asUser(rider),
      data: { trickId: trick.id },
      deleteRemoteAsset: async (assetId) => {
        deletedAssets.push(assetId)
      },
    })

    expect(result).toEqual({ removed: 1 })

    const remainingRows = await db.query.trickVideos.findMany()
    expect(remainingRows.map((r) => r.id).toSorted()).toEqual(
      [rejected.id, others.id].toSorted(),
    )

    // The direct-upload asset was destroyed remotely and locally
    expect(deletedAssets).toEqual([own.muxAssetId])
    const remainingAssets = await db.query.muxVideos.findMany()
    expect(remainingAssets.map((a) => a.assetId)).not.toContain(own.muxAssetId)
  })

  it("unlandTrick keeps a shared (vault-linked) mux asset", async () => {
    const rider = await seedUser({ name: "Rider" })
    const trick = await seedTrick("Vault Linked Trick")
    const video = await seedMuxVideo()

    await db.insert(utvVideos).values({
      legacyUrl: "https://example.com",
      legacyTitle: "vault video",
      muxAssetId: video.assetId,
    })
    await db.insert(trickVideos).values({
      muxAssetId: video.assetId,
      status: "pending",
      submittedByUserId: rider.id,
      trickId: trick.id,
    })

    const deletedAssets: string[] = []
    await unlandTrick({
      ...asUser(rider),
      data: { trickId: trick.id },
      deleteRemoteAsset: async (assetId) => {
        deletedAssets.push(assetId)
      },
    })

    // The landing row is gone but the asset survives for the vault
    expect(await db.query.trickVideos.findMany()).toHaveLength(0)
    expect(deletedAssets).toEqual([])
    const assets = await db.query.muxVideos.findMany()
    expect(assets.map((a) => a.assetId)).toContain(video.assetId)
  })

  it("unlandTrick still removes the landing when the remote delete fails", async () => {
    const rider = await seedUser({ name: "Rider" })
    const trick = await seedTrick("Flaky Mux Trick")

    const own = await seedTrickVideo({
      trickId: trick.id,
      userId: rider.id,
      status: "pending",
    })

    const result = await unlandTrick({
      ...asUser(rider),
      data: { trickId: trick.id },
      deleteRemoteAsset: async () => {
        throw new Error("mux is down")
      },
    })

    expect(result).toEqual({ removed: 1 })
    expect(await db.query.trickVideos.findMany()).toHaveLength(0)
    const assets = await db.query.muxVideos.findMany()
    expect(assets.map((a) => a.assetId)).not.toContain(own.muxAssetId)
  })

  it("landTrick rejects submitting the same video twice for one trick", async () => {
    const rider = await seedUser({ name: "Rider" })
    const trick = await seedTrick("Duplicate Trick")
    const video = await seedMuxVideo()

    const data = {
      trickId: trick.id,
      muxAssetId: video.assetId,
      notes: null,
      confirmedSingleTrick: true as const,
    }

    await landTrick({ ...asUser(rider), data })
    await expect(landTrick({ ...asUser(rider), data })).rejects.toThrow(
      "Video already submitted for this trick",
    )
  })

  it("vaultVideosForUser returns only the rider's playable vault videos", async () => {
    const rider = await seedUser({ name: "Rider" })
    const other = await seedUser({ name: "Other" })

    const playable = await seedMuxVideo()
    const otherAsset = await seedMuxVideo()
    // A mux row without a playback id — footage that can't be shown
    const [unplayable] = await db
      .insert(muxVideos)
      .values({ assetId: "asset-unplayable" })
      .returning()

    const [mine] = await db
      .insert(utvVideos)
      .values({
        legacyUrl: "https://example.com/1",
        legacyTitle: "legacy title",
        muxAssetId: playable.assetId,
      })
      .returning()
    const [notMine] = await db
      .insert(utvVideos)
      .values({
        legacyUrl: "https://example.com/2",
        legacyTitle: "someone else",
        muxAssetId: otherAsset.assetId,
      })
      .returning()
    const [broken] = await db
      .insert(utvVideos)
      .values({
        legacyUrl: "https://example.com/3",
        legacyTitle: "no playback",
        muxAssetId: unplayable.assetId,
      })
      .returning()

    await db.insert(utvVideoRiders).values([
      { utvVideoId: mine.id, userId: rider.id },
      { utvVideoId: notMine.id, userId: other.id },
      { utvVideoId: broken.id, userId: rider.id },
    ])

    const options = await vaultVideosForUser(rider.id, async () => 92.4)

    expect(options).toEqual([
      {
        utvVideoId: mine.id,
        // Empty title falls back to the legacy title
        title: "legacy title",
        muxAssetId: playable.assetId,
        playbackId: playable.playbackId,
        thumbnailSeconds: 30,
        durationSeconds: 92.4,
      },
    ])
  })

  it("unlandTrick throws when there is no landing to remove", async () => {
    const rider = await seedUser({ name: "Rider" })
    const trick = await seedTrick("Never Landed Trick")

    await expect(
      unlandTrick({
        ...asUser(rider),
        data: { trickId: trick.id },
      }),
    ).rejects.toThrow("No landing to remove")
  })
})
