import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  bius,
  biuSets,
  muxVideos,
  rius,
  riuSets,
  riuSubmissions,
  sius,
  siuSets,
  trickVideos,
  tricks,
  utvVideos,
} from "~/db/schema"
import {
  gameVideosForUser,
  landTrick,
  landingsForUser,
  unlandTrick,
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

  it("gameVideosForUser returns the rider's playable sets and submissions, newest first", async () => {
    const rider = await seedUser({ name: "Rider" })
    const other = await seedUser({ name: "Other" })

    const [riu] = await db.insert(rius).values({}).returning()
    const [biu] = await db.insert(bius).values({}).returning()
    const [siu] = await db.insert(sius).values({}).returning()

    const riuSetAsset = await seedMuxVideo()
    const submissionAsset = await seedMuxVideo()
    const biuAsset = await seedMuxVideo()
    const siuAsset = await seedMuxVideo()
    const deletedAsset = await seedMuxVideo()
    const otherAsset = await seedMuxVideo()
    // A mux row without a playback id — footage that can't be shown
    const [unplayable] = await db
      .insert(muxVideos)
      .values({ assetId: "asset-unplayable" })
      .returning()

    const [myRiuSet] = await db
      .insert(riuSets)
      .values({
        riuId: riu.id,
        userId: rider.id,
        name: "my riu set",
        muxAssetId: riuSetAsset.assetId,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      })
      .returning()
    // Another rider's set that ours submitted to — the submission counts,
    // the host set itself does not.
    const [othersSet] = await db
      .insert(riuSets)
      .values({
        riuId: riu.id,
        userId: other.id,
        name: "others set",
        muxAssetId: otherAsset.assetId,
      })
      .returning()
    const [mySubmission] = await db
      .insert(riuSubmissions)
      .values({
        riuSetId: othersSet.id,
        userId: rider.id,
        muxAssetId: submissionAsset.assetId,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      })
      .returning()
    const [mySiuSet] = await db
      .insert(siuSets)
      .values({
        siuId: siu.id,
        userId: rider.id,
        name: "my siu set",
        muxAssetId: siuAsset.assetId,
        position: 0,
        createdAt: new Date("2026-03-01T00:00:00Z"),
      })
      .returning()
    const [myBiuSet] = await db
      .insert(biuSets)
      .values({
        biuId: biu.id,
        userId: rider.id,
        name: "my biu set",
        muxAssetId: biuAsset.assetId,
        position: 0,
        createdAt: new Date("2026-04-01T00:00:00Z"),
      })
      .returning()
    // Soft-deleted and unplayable footage never shows up
    await db.insert(siuSets).values({
      siuId: siu.id,
      userId: rider.id,
      name: "deleted siu set",
      muxAssetId: deletedAsset.assetId,
      position: 1,
      deletedAt: new Date(),
    })
    await db.insert(siuSets).values({
      siuId: siu.id,
      userId: rider.id,
      name: "unplayable siu set",
      muxAssetId: unplayable.assetId,
      position: 2,
    })

    const options = await gameVideosForUser(rider.id)

    expect(options).toEqual([
      {
        id: `biu-set-${myBiuSet.id}`,
        label: "my biu set",
        game: "biu",
        kind: "set",
        muxAssetId: biuAsset.assetId,
        playbackId: `playback-${biuAsset.assetId}`,
      },
      {
        id: `siu-set-${mySiuSet.id}`,
        label: "my siu set",
        game: "siu",
        kind: "set",
        muxAssetId: siuAsset.assetId,
        playbackId: `playback-${siuAsset.assetId}`,
      },
      {
        id: `riu-submission-${mySubmission.id}`,
        // A submission is labeled by the set it answered
        label: "others set",
        game: "riu",
        kind: "submission",
        muxAssetId: submissionAsset.assetId,
        playbackId: `playback-${submissionAsset.assetId}`,
      },
      {
        id: `riu-set-${myRiuSet.id}`,
        label: "my riu set",
        game: "riu",
        kind: "set",
        muxAssetId: riuSetAsset.assetId,
        playbackId: `playback-${riuSetAsset.assetId}`,
      },
    ])
  })

  it("gameVideosForUser offers a shared asset once — newest occurrence wins", async () => {
    const rider = await seedUser({ name: "Rider" })

    const [riu] = await db.insert(rius).values({}).returning()
    const shared = await seedMuxVideo()

    await db.insert(riuSets).values({
      riuId: riu.id,
      userId: rider.id,
      name: "old set",
      muxAssetId: shared.assetId,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    })
    const [hostSet] = await db
      .insert(riuSets)
      .values({
        riuId: riu.id,
        userId: rider.id,
        name: "host set",
        muxAssetId: shared.assetId,
        createdAt: new Date("2026-01-02T00:00:00Z"),
      })
      .returning()
    const [newer] = await db
      .insert(riuSubmissions)
      .values({
        riuSetId: hostSet.id,
        userId: rider.id,
        muxAssetId: shared.assetId,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      })
      .returning()

    const options = await gameVideosForUser(rider.id)

    expect(options).toHaveLength(1)
    expect(options[0]?.id).toBe(`riu-submission-${newer.id}`)
    expect(options[0]?.muxAssetId).toBe(shared.assetId)
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
