import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { trickVideos, tricks } from "~/db/schema"
import {
  landingCounts,
  landingsForUser,
} from "~/lib/tricks/landings/ops.server"
import {
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
})
