import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { riuSets, riuSubmissions, rius, userFollows } from "~/db/schema"
import {
  createRiuSet,
  createRiuSubmission,
  deleteRiuSet,
  deleteRiuSubmission,
  listArchivedRius,
  rotateRius,
  updateRiuSet,
} from "~/lib/games/rius/ops.server"
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

async function seedRiu(status: "active" | "archived" | "upcoming") {
  const [riu] = await db.insert(rius).values({ status }).returning()
  return riu
}

async function seedRiuSet(args: {
  instructions?: string
  muxAssetId?: string
  name: string
  riuId: number
  userId: number
}) {
  const video = await seedMuxVideo(args.muxAssetId)

  const [set] = await db
    .insert(riuSets)
    .values({
      instructions: args.instructions,
      muxAssetId: video.assetId,
      name: args.name,
      riuId: args.riuId,
      userId: args.userId,
    })
    .returning()

  return set
}

describe("rius integration", () => {
  it("createRiuSet creates into the current upcoming RIU and notifies followers", async () => {
    const actor = await seedUser({ name: "Actor" })
    const follower = await seedUser({ name: "Follower" })
    const upcoming = await seedRiu("upcoming")
    await seedRiu("active")
    const video = await seedMuxVideo("riu-set-create")

    await db.insert(userFollows).values({
      followedByUserId: follower.id,
      followedUserId: actor.id,
    })

    const set = await createRiuSet({
      ...asUser(actor),
      data: {
        instructions: "practice this",
        muxAssetId: video.assetId,
        name: "Upcoming Set",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(1)
    })

    expect(set).toEqual(
      expect.objectContaining({
        name: "Upcoming Set",
        riuId: upcoming.id,
        userId: actor.id,
      }),
    )
    expect(await db.query.notifications.findMany()).toEqual([
      expect.objectContaining({
        actorId: actor.id,
        entityId: set.id,
        entityType: "riuSet",
        type: "new_content",
        userId: follower.id,
      }),
    ])
  })

  it("updateRiuSet is owner-only and upcoming-only", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })
    const upcoming = await seedRiu("upcoming")
    const active = await seedRiu("active")

    const upcomingSet = await seedRiuSet({
      name: "Upcoming Set",
      riuId: upcoming.id,
      userId: owner.id,
    })
    const activeSet = await seedRiuSet({
      name: "Active Set",
      riuId: active.id,
      userId: owner.id,
    })

    await expect(
      updateRiuSet({
        ...asUser(otherUser),
        data: {
          instructions: "x",
          name: "Nope",
          riuSetId: upcomingSet.id,
        },
      }),
    ).rejects.toThrow("Access denied")

    await expect(
      updateRiuSet({
        ...asUser(owner),
        data: {
          instructions: "x",
          name: "Nope",
          riuSetId: activeSet.id,
        },
      }),
    ).rejects.toThrow("Access denied")

    const updated = await updateRiuSet({
      ...asUser(owner),
      data: {
        instructions: "updated instructions",
        name: "Updated Set",
        riuSetId: upcomingSet.id,
      },
    })

    expect(updated).toEqual(
      expect.objectContaining({
        id: upcomingSet.id,
        instructions: "updated instructions",
        name: "Updated Set",
      }),
    )
  })

  it("deleteRiuSet is owner-only and upcoming-only", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })
    const upcoming = await seedRiu("upcoming")
    const active = await seedRiu("active")

    const upcomingSet = await seedRiuSet({
      name: "Upcoming Set",
      riuId: upcoming.id,
      userId: owner.id,
    })
    const activeSet = await seedRiuSet({
      name: "Active Set",
      riuId: active.id,
      userId: owner.id,
    })

    await expect(
      deleteRiuSet({
        ...asUser(otherUser),
        data: {
          riuSetId: upcomingSet.id,
        },
      }),
    ).rejects.toThrow("Access denied")

    await expect(
      deleteRiuSet({
        ...asUser(owner),
        data: {
          riuSetId: activeSet.id,
        },
      }),
    ).rejects.toThrow("Access denied")

    await expect(
      deleteRiuSet({
        ...asUser(owner),
        data: {
          riuSetId: upcomingSet.id,
        },
      }),
    ).resolves.toEqual(expect.objectContaining({ id: upcomingSet.id }))
  })

  it("createRiuSubmission requires an active round, rejects self-submissions, and persists successful submissions", async () => {
    const setOwner = await seedUser({ name: "Set Owner" })
    const submitter = await seedUser({ name: "Submitter" })
    const active = await seedRiu("active")
    const upcoming = await seedRiu("upcoming")

    const activeSet = await seedRiuSet({
      name: "Active Set",
      riuId: active.id,
      userId: setOwner.id,
    })
    const upcomingSet = await seedRiuSet({
      name: "Upcoming Set",
      riuId: upcoming.id,
      userId: setOwner.id,
    })
    const activeVideo = await seedMuxVideo("riu-sub-active")
    const upcomingVideo = await seedMuxVideo("riu-sub-upcoming")

    await expect(
      createRiuSubmission({
        ...asUser(setOwner),
        data: {
          muxAssetId: activeVideo.assetId,
          riuSetId: activeSet.id,
        },
      }),
    ).rejects.toThrow("You cannot submit to your own set")

    await expect(
      createRiuSubmission({
        ...asUser(submitter),
        data: {
          muxAssetId: upcomingVideo.assetId,
          riuSetId: upcomingSet.id,
        },
      }),
    ).rejects.toThrow("RIU set is not from an active RIU")

    const created = await createRiuSubmission({
      ...asUser(submitter),
      data: {
        muxAssetId: activeVideo.assetId,
        riuSetId: activeSet.id,
      },
    })

    expect(created).toEqual(
      expect.objectContaining({
        muxAssetId: activeVideo.assetId,
        riuSetId: activeSet.id,
        userId: submitter.id,
      }),
    )
  })

  it("deleteRiuSubmission is owner-only", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })
    const active = await seedRiu("active")
    const set = await seedRiuSet({
      name: "Active Set",
      riuId: active.id,
      userId: owner.id,
    })
    const video = await seedMuxVideo("riu-sub-delete")

    const [submission] = await db
      .insert(riuSubmissions)
      .values({
        muxAssetId: video.assetId,
        riuSetId: set.id,
        userId: owner.id,
      })
      .returning()

    await expect(
      deleteRiuSubmission({
        ...asUser(otherUser),
        data: {
          submissionId: submission.id,
        },
      }),
    ).rejects.toThrow("Access denied")

    await expect(
      deleteRiuSubmission({
        ...asUser(owner),
        data: {
          submissionId: submission.id,
        },
      }),
    ).resolves.toEqual(expect.objectContaining({ id: submission.id }))
  })

  it("rotateRius archives the active round, activates the upcoming round, and creates one new upcoming round", async () => {
    const active = await seedRiu("active")
    const upcoming = await seedRiu("upcoming")
    const archived = await seedRiu("archived")

    await rotateRius()

    const rows = await db.query.rius.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows.find((row) => row.id === active.id)?.status).toBe("archived")
    expect(rows.find((row) => row.id === upcoming.id)?.status).toBe("active")
    expect(rows.find((row) => row.id === archived.id)?.status).toBe("archived")
    expect(rows.filter((row) => row.status === "upcoming")).toHaveLength(1)
    expect(rows).toHaveLength(4)
  })

  it("listArchivedRius returns real aggregate set and submission counts", async () => {
    const owner = await seedUser({ name: "Owner" })
    const submitter = await seedUser({ name: "Submitter" })
    const submitter2 = await seedUser({ name: "Submitter2" })
    const archivedA = await seedRiu("archived")
    const archivedB = await seedRiu("archived")

    const setA1 = await seedRiuSet({
      name: "Archived A1",
      riuId: archivedA.id,
      userId: owner.id,
    })
    const setA2 = await seedRiuSet({
      name: "Archived A2",
      riuId: archivedA.id,
      userId: owner.id,
    })
    const setB1 = await seedRiuSet({
      name: "Archived B1",
      riuId: archivedB.id,
      userId: owner.id,
    })
    const video1 = await seedMuxVideo("riu-agg-1")
    const video2 = await seedMuxVideo("riu-agg-2")
    const video3 = await seedMuxVideo("riu-agg-3")

    await db.insert(riuSubmissions).values([
      {
        muxAssetId: video1.assetId,
        riuSetId: setA1.id,
        userId: submitter.id,
      },
      {
        muxAssetId: video2.assetId,
        riuSetId: setA1.id,
        userId: submitter2.id,
      },
      {
        muxAssetId: video3.assetId,
        riuSetId: setB1.id,
        userId: submitter.id,
      },
    ])

    const archived = await listArchivedRius()

    expect(archived).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: archivedA.id,
          setsCount: 2,
          submissionsCount: 2,
        }),
        expect.objectContaining({
          id: archivedB.id,
          setsCount: 1,
          submissionsCount: 1,
        }),
      ]),
    )
    expect(setA2).toBeTruthy()
  })
})
