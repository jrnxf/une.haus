import { beforeEach, describe, expect, it } from "bun:test"

import { asUser, seedMuxVideo, seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import { trickElements, tricks } from "~/db/schema"
import {
  createTrickImpl,
  deleteTrickImpl,
  updateTrickImpl,
} from "~/lib/tricks/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

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

describe("tricks integration", () => {
  it("createTrick creates the base row plus relationships, elements, videos, and compositions", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const target = await seedTrick({
      name: "Target",
      slug: "target",
      spin: 180,
    })
    const componentA = await seedTrick({
      name: "Component A",
      slug: "component-a",
      spin: 360,
    })
    const componentB = await seedTrick({
      name: "Component B",
      slug: "component-b",
      spin: 540,
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

    const trick = await createTrickImpl({
      ...asUser(admin),
      data: {
        alternateNames: ["combo"],
        compositions: [
          { catchType: null, componentTrickId: componentA.id, position: 0 },
          {
            catchType: "one-foot",
            componentTrickId: componentB.id,
            position: 1,
          },
        ],
        description: "compound trick",
        elementIds: [elementA.id, elementB.id],
        inventedBy: null,
        inventedByUserId: null,
        isCompound: true,
        muxAssetIds: [videoA.assetId, videoB.assetId],
        name: "Compound Trick",
        notes: "notes",
        relationships: [{ targetTrickId: target.id, type: "prerequisite" }],
        slug: "compound-trick",
        yearLanded: 2024,
      },
    })

    expect(trick).toEqual(
      expect.objectContaining({
        isCompound: true,
        name: "Compound Trick",
        slug: "compound-trick",
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
    expect(await db.query.trickCompositions.findMany()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          catchType: null,
          componentTrickId: componentA.id,
          compoundTrickId: trick.id,
          position: 0,
        }),
        expect.objectContaining({
          catchType: "one-foot",
          componentTrickId: componentB.id,
          compoundTrickId: trick.id,
          position: 1,
        }),
      ]),
    )
  })

  it("updateTrick replaces relationships, elements, videos, and compositions", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const targetOld = await seedTrick({
      name: "Target Old",
      slug: "target-old",
      spin: 180,
    })
    const targetNew = await seedTrick({
      name: "Target New",
      slug: "target-new",
      spin: 360,
    })
    const componentOld = await seedTrick({
      name: "Component Old",
      slug: "component-old",
      spin: 540,
    })
    const componentNew = await seedTrick({
      name: "Component New",
      slug: "component-new",
      spin: 720,
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

    const trick = await createTrickImpl({
      ...asUser(admin),
      data: {
        alternateNames: [],
        compositions: [
          { catchType: null, componentTrickId: componentOld.id, position: 0 },
        ],
        description: null,
        elementIds: [elementOld.id],
        inventedBy: null,
        inventedByUserId: null,
        isCompound: true,
        muxAssetIds: [oldVideo.assetId],
        name: "Update Me",
        notes: null,
        relationships: [{ targetTrickId: targetOld.id, type: "related" }],
        slug: "update-me",
        yearLanded: null,
      },
    })

    const updated = await updateTrickImpl({
      ...asUser(admin),
      data: {
        alternateNames: ["updated"],
        compositions: [
          {
            catchType: "two-foot",
            componentTrickId: componentNew.id,
            position: 0,
          },
        ],
        description: "updated description",
        elementIds: [elementNew.id],
        id: trick.id,
        inventedBy: "Inventor",
        inventedByUserId: null,
        isCompound: true,
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
    expect(await db.query.trickCompositions.findMany()).toEqual([
      expect.objectContaining({
        catchType: "two-foot",
        componentTrickId: componentNew.id,
        compoundTrickId: trick.id,
        position: 0,
      }),
    ])
  })

  it("deleteTrick removes dependent rows through cascade behavior", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const target = await seedTrick({
      name: "Target",
      slug: "delete-target",
      spin: 180,
    })
    const component = await seedTrick({
      name: "Component",
      slug: "delete-component",
      spin: 360,
    })
    const [element] = await db
      .insert(trickElements)
      .values({
        name: "Delete Element",
        slug: "delete-element",
      })
      .returning()
    const video = await seedMuxVideo("trick-delete-video")

    const trick = await createTrickImpl({
      ...asUser(admin),
      data: {
        alternateNames: [],
        compositions: [
          { catchType: null, componentTrickId: component.id, position: 0 },
        ],
        description: null,
        elementIds: [element.id],
        inventedBy: null,
        inventedByUserId: null,
        isCompound: true,
        muxAssetIds: [video.assetId],
        name: "Delete Trick",
        notes: null,
        relationships: [{ targetTrickId: target.id, type: "related" }],
        slug: "delete-trick",
        yearLanded: null,
      },
    })

    await expect(
      deleteTrickImpl({
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
    expect(await db.query.trickCompositions.findMany()).toHaveLength(0)
  })
})
