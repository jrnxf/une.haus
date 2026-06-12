import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  flags,
  glossaryProposals,
  tricks,
  trickSubmissions,
  trickSuggestions,
  trickVideos,
  utvVideos,
  utvVideoSuggestions,
} from "~/db/schema"
import { getPendingCount } from "~/lib/admin/ops.server"
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

describe("admin pending count integration", () => {
  it("returns 0 when there is no pending work", async () => {
    expect(await getPendingCount()).toBe(0)
  })

  it("counts one pending row across all six sources", async () => {
    const user = await seedUser({ name: "User" })
    const trick = await seedTrick("Base Trick")
    const muxVideo = await seedMuxVideo()
    const utvVideo = await db
      .insert(utvVideos)
      .values({
        legacyUrl: "https://example.com/v",
        legacyTitle: "Legacy",
        title: "UTV Video",
        muxAssetId: muxVideo.assetId,
      })
      .returning()
      .then((rows) => rows[0])

    // 1. pending trick submission
    await db.insert(trickSubmissions).values({
      name: "Pending Submission",
      submittedByUserId: user.id,
      status: "pending",
    })

    // 2. pending trick suggestion
    await db.insert(trickSuggestions).values({
      trickId: trick.id,
      diff: { name: "Edit" },
      submittedByUserId: user.id,
      status: "pending",
    })

    // 3. pending trick video
    await db.insert(trickVideos).values({
      trickId: trick.id,
      muxAssetId: muxVideo.assetId,
      submittedByUserId: user.id,
      status: "pending",
    })

    // 4. pending glossary proposal
    await db.insert(glossaryProposals).values({
      action: "create",
      type: "element",
      name: "Pending Element",
      submittedByUserId: user.id,
      status: "pending",
    })

    // 5. pending utv video suggestion
    await db.insert(utvVideoSuggestions).values({
      utvVideoId: utvVideo.id,
      diff: { title: "Better" },
      submittedByUserId: user.id,
      status: "pending",
    })

    // 6. unresolved flag
    await db.insert(flags).values({
      entityType: "post",
      entityId: 1,
      reason: "spam",
      userId: user.id,
    })

    expect(await getPendingCount()).toBe(6)
  })

  it("ignores non-pending rows (approved submission, resolved flag)", async () => {
    const user = await seedUser({ name: "User" })

    // An approved submission should not count.
    await db.insert(trickSubmissions).values({
      name: "Approved Submission",
      submittedByUserId: user.id,
      status: "approved",
    })

    // A resolved flag should not count.
    await db.insert(flags).values({
      entityType: "post",
      entityId: 2,
      reason: "spam",
      userId: user.id,
      resolvedAt: new Date(),
      resolvedByUserId: user.id,
      resolution: "dismissed",
    })

    expect(await getPendingCount()).toBe(0)
  })
})
