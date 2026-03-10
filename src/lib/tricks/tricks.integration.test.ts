import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { trickElements, tricks } from "~/db/schema"
import {
  createTrick,
  deleteTrick,
  listTricks,
  updateTrick,
} from "~/lib/tricks/ops.server"
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
      slug: overrides.slug ?? `base-trick-${Date.now()}`,
      ...overrides,
    })
    .returning()

  return trick
}

describe("tricks integration", () => {
  it("createTrick creates the base row plus relationships, elements, and videos", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const target = await seedTrick({
      name: "Target",
      slug: "target",
    })
    const [elementA, elementB] = await db
      .insert(trickElements)
      .values([
        { name: "Spin", slug: "spin" },
        { name: "Flip", slug: "flip" },
      ])
      .returning()
    const videoA = await seedMuxVideo("trick-create-a")
    const videoB = await seedMuxVideo("trick-create-b")

    const trick = await createTrick({
      ...asUser(admin),
      data: {
        alternateNames: ["combo"],
        description: "a trick",
        elementIds: [elementA.id, elementB.id],
        inventedBy: null,
        inventedByUserId: null,
        muxAssetIds: [videoA.assetId, videoB.assetId],
        name: "New Trick",
        notes: "notes",
        relationships: [{ targetTrickId: target.id, type: "prerequisite" }],
        slug: "new-trick",
        yearLanded: 2024,
      },
    })

    expect(trick).toEqual(
      expect.objectContaining({
        name: "New Trick",
        slug: "new-trick",
      }),
    )
    expect(await db.query.trickRelationships.findMany()).toEqual([
      expect.objectContaining({
        sourceTrickId: trick.id,
        targetTrickId: target.id,
        type: "prerequisite",
      }),
    ])
    expect(await db.query.trickElementAssignments.findMany()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trickId: trick.id, elementId: elementA.id }),
        expect.objectContaining({ trickId: trick.id, elementId: elementB.id }),
      ]),
    )
    expect(await db.query.trickVideos.findMany()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trickId: trick.id,
          muxAssetId: videoA.assetId,
          sortOrder: 0,
          status: "active",
        }),
        expect.objectContaining({
          trickId: trick.id,
          muxAssetId: videoB.assetId,
          sortOrder: 1,
          status: "active",
        }),
      ]),
    )
  })

  it("updateTrick replaces relationships, elements, and videos", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const targetOld = await seedTrick({
      name: "Target Old",
      slug: "target-old",
    })
    const targetNew = await seedTrick({
      name: "Target New",
      slug: "target-new",
    })
    const [elementOld, elementNew] = await db
      .insert(trickElements)
      .values([
        { name: "Old Element", slug: "old-element" },
        { name: "New Element", slug: "new-element" },
      ])
      .returning()
    const oldVideo = await seedMuxVideo("trick-update-old")
    const newVideoA = await seedMuxVideo("trick-update-new-a")
    const newVideoB = await seedMuxVideo("trick-update-new-b")

    const trick = await createTrick({
      ...asUser(admin),
      data: {
        alternateNames: [],
        description: null,
        elementIds: [elementOld.id],
        inventedBy: null,
        inventedByUserId: null,
        muxAssetIds: [oldVideo.assetId],
        name: "Update Me",
        notes: null,
        relationships: [{ targetTrickId: targetOld.id, type: "related" }],
        slug: "update-me",
        yearLanded: null,
      },
    })

    const updated = await updateTrick({
      ...asUser(admin),
      data: {
        alternateNames: ["updated"],
        description: "updated description",
        elementIds: [elementNew.id],
        id: trick.id,
        inventedBy: "Inventor",
        inventedByUserId: null,
        muxAssetIds: [newVideoA.assetId, newVideoB.assetId],
        name: "Updated Trick",
        notes: "updated notes",
        relationships: [{ targetTrickId: targetNew.id, type: "prerequisite" }],
        slug: "update-me",
        yearLanded: 2025,
      },
    })

    expect(updated).toEqual(
      expect.objectContaining({
        description: "updated description",
        id: trick.id,
        name: "Updated Trick",
        notes: "updated notes",
      }),
    )
    expect(await db.query.trickRelationships.findMany()).toEqual([
      expect.objectContaining({
        sourceTrickId: trick.id,
        targetTrickId: targetNew.id,
        type: "prerequisite",
      }),
    ])
    expect(await db.query.trickElementAssignments.findMany()).toEqual([
      expect.objectContaining({
        elementId: elementNew.id,
        trickId: trick.id,
      }),
    ])
    expect(await db.query.trickVideos.findMany()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          muxAssetId: newVideoA.assetId,
          sortOrder: 0,
          trickId: trick.id,
        }),
        expect.objectContaining({
          muxAssetId: newVideoB.assetId,
          sortOrder: 1,
          trickId: trick.id,
        }),
      ]),
    )
    expect(
      (await db.query.trickVideos.findMany()).find(
        (video) => video.muxAssetId === oldVideo.assetId,
      ),
    ).toBeUndefined()
  })

  it("deleteTrick removes dependent rows through cascade behavior", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const target = await seedTrick({
      name: "Target",
      slug: "delete-target",
    })
    const [element] = await db
      .insert(trickElements)
      .values({
        name: "Delete Element",
        slug: "delete-element",
      })
      .returning()
    const video = await seedMuxVideo("trick-delete-video")

    const trick = await createTrick({
      ...asUser(admin),
      data: {
        alternateNames: [],
        description: null,
        elementIds: [element.id],
        inventedBy: null,
        inventedByUserId: null,
        muxAssetIds: [video.assetId],
        name: "Delete Trick",
        notes: null,
        relationships: [{ targetTrickId: target.id, type: "related" }],
        slug: "delete-trick",
        yearLanded: null,
      },
    })

    await expect(
      deleteTrick({
        data: trick.id,
      }),
    ).resolves.toEqual(expect.objectContaining({ id: trick.id }))

    expect(
      await db.query.tricks.findFirst({
        where: (table, { eq }) => eq(table.id, trick.id),
      }),
    ).toBeUndefined()
    expect(await db.query.trickRelationships.findMany()).toHaveLength(0)
    expect(await db.query.trickElementAssignments.findMany()).toHaveLength(0)
    expect(await db.query.trickVideos.findMany()).toHaveLength(0)
  })

  it("moves past the cursor instead of re-fetching the cursor row", async () => {
    const [alpha, beta, gamma] = await db
      .insert(tricks)
      .values([
        { name: "Alpha", slug: "alpha" },
        { name: "Beta", slug: "beta" },
        { name: "Gamma", slug: "gamma" },
      ])
      .returning()

    const firstPage = await listTricks({
      data: {
        limit: 2,
      },
    })
    const secondPage = await listTricks({
      data: {
        cursor: beta.id,
        limit: 2,
      },
    })

    expect(firstPage.map((trick) => trick.id)).toEqual([alpha.id, beta.id])
    expect(secondPage.map((trick) => trick.id)).toEqual([gamma.id])
  })
})
