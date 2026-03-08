import { beforeEach, describe, expect, it } from "bun:test"

import {
  asUser,
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "./helpers"
import { db } from "~/db"
import {
  biuSetLikes,
  biuSetMessages,
  biuSets,
  bius,
  userFollows,
} from "~/db/schema"
import {
  backUpBiuSetImpl,
  createFirstBiuSetImpl,
  deleteBiuSetImpl,
} from "~/lib/games/bius/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedRound() {
  const [round] = await db.insert(bius).values({}).returning()
  return round
}

async function seedBiuSet(args: {
  roundId: number
  userId: number
  position: number
  parentSetId?: number | null
  assetId?: string
  name?: string
}) {
  const video = await seedMuxVideo(args.assetId)

  const [set] = await db
    .insert(biuSets)
    .values({
      biuId: args.roundId,
      muxAssetId: video.assetId,
      name: args.name ?? `Set ${args.position}`,
      parentSetId: args.parentSetId ?? null,
      position: args.position,
      userId: args.userId,
    })
    .returning()

  return set
}

describe("bius integration", () => {
  it("createFirstBiuSet creates the only first set and optional instruction message", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })
    const firstVideo = await seedMuxVideo("biu-first")
    const secondVideo = await seedMuxVideo("biu-second")
    const round = await seedRound()

    const set = await createFirstBiuSetImpl({
      ...asUser(owner),
      data: {
        instructions: "  start here  ",
        muxAssetId: firstVideo.assetId,
        name: "First BIU Set",
        roundId: round.id,
      },
    })

    await expect(
      createFirstBiuSetImpl({
        ...asUser(otherUser),
        data: {
          muxAssetId: secondVideo.assetId,
          name: "Another First BIU Set",
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("Round already has a first set")

    const messages = await db.query.biuSetMessages.findMany()

    expect(set).toEqual(
      expect.objectContaining({
        biuId: round.id,
        name: "First BIU Set",
        parentSetId: null,
        position: 1,
        userId: owner.id,
      }),
    )
    expect(messages).toEqual([
      expect.objectContaining({
        biuSetId: set.id,
        content: "start here",
        userId: owner.id,
      }),
    ])
  })

  it("backUpBiuSet continues the latest set, increments position, stores instructions, and notifies followers", async () => {
    const originalSetter = await seedUser({ name: "Original Setter" })
    const latestSetter = await seedUser({ name: "Latest Setter" })
    const actor = await seedUser({ name: "Actor" })
    const follower = await seedUser({ name: "Follower" })
    const round = await seedRound()

    await db.insert(userFollows).values({
      followedByUserId: follower.id,
      followedUserId: actor.id,
    })

    await seedBiuSet({
      assetId: "biu-add-1",
      position: 1,
      roundId: round.id,
      userId: originalSetter.id,
    })
    const latestSet = await seedBiuSet({
      assetId: "biu-add-2",
      position: 2,
      roundId: round.id,
      userId: latestSetter.id,
    })
    const nextVideo = await seedMuxVideo("biu-add-3")

    const set = await backUpBiuSetImpl({
      ...asUser(actor),
      data: {
        instructions: "  back it up  ",
        muxAssetId: nextVideo.assetId,
        name: "Third BIU Set",
        roundId: round.id,
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(1)
    })

    const messages = await db.query.biuSetMessages.findMany()
    const [notification] = await db.query.notifications.findMany()

    expect(set).toEqual(
      expect.objectContaining({
        biuId: round.id,
        name: "Third BIU Set",
        parentSetId: latestSet.id,
        position: 3,
        userId: actor.id,
      }),
    )
    expect(messages).toEqual([
      expect.objectContaining({
        biuSetId: set.id,
        content: "back it up",
        userId: actor.id,
      }),
    ])
    expect(notification).toEqual(
      expect.objectContaining({
        actorId: actor.id,
        entityId: set.id,
        entityType: "biuSet",
        type: "new_content",
        userId: follower.id,
      }),
    )
  })

  it("backUpBiuSet rejects continuing your own latest set", async () => {
    const actor = await seedUser({ name: "Actor" })
    const round = await seedRound()

    await seedBiuSet({
      assetId: "biu-self",
      position: 1,
      roundId: round.id,
      userId: actor.id,
    })
    const video = await seedMuxVideo("biu-self-next")

    await expect(
      backUpBiuSetImpl({
        ...asUser(actor),
        data: {
          muxAssetId: video.assetId,
          name: "Nope",
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("You cannot back up your own set")
  })

  it("backUpBiuSet rejects adding another child when the latest set already has one", async () => {
    const latestSetter = await seedUser({ name: "Latest Setter" })
    const childSetter = await seedUser({ name: "Child Setter" })
    const actor = await seedUser({ name: "Actor" })
    const round = await seedRound()

    const latestSet = await seedBiuSet({
      assetId: "biu-dup-parent",
      position: 5,
      roundId: round.id,
      userId: latestSetter.id,
    })
    await seedBiuSet({
      assetId: "biu-dup-child",
      parentSetId: latestSet.id,
      position: 4,
      roundId: round.id,
      userId: childSetter.id,
    })
    const video = await seedMuxVideo("biu-dup-next")

    await expect(
      backUpBiuSetImpl({
        ...asUser(actor),
        data: {
          muxAssetId: video.assetId,
          name: "Duplicate Child",
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("This set has already been backed up")
  })

  it("deleteBiuSet soft-deletes a parent with children and removes engagement rows", async () => {
    const owner = await seedUser({ name: "Owner" })
    const childUser = await seedUser({ name: "Child User" })
    const liker = await seedUser({ name: "Liker" })
    const round = await seedRound()

    const parent = await seedBiuSet({
      assetId: "biu-soft-parent",
      name: "Parent",
      position: 1,
      roundId: round.id,
      userId: owner.id,
    })
    await seedBiuSet({
      assetId: "biu-soft-child",
      name: "Child",
      parentSetId: parent.id,
      position: 2,
      roundId: round.id,
      userId: childUser.id,
    })

    await db.insert(biuSetMessages).values({
      biuSetId: parent.id,
      content: "instructions",
      userId: owner.id,
    })
    await db.insert(biuSetLikes).values({
      biuSetId: parent.id,
      userId: liker.id,
    })

    const result = await deleteBiuSetImpl({
      ...asUser(owner),
      data: {
        setId: parent.id,
      },
    })

    const rereadParent = await db.query.biuSets.findFirst({
      where: (table, { eq }) => eq(table.id, parent.id),
    })
    const remainingMessages = await db.query.biuSetMessages.findMany({
      where: (table, { eq }) => eq(table.biuSetId, parent.id),
    })
    const remainingLikes = await db.query.biuSetLikes.findMany({
      where: (table, { eq }) => eq(table.biuSetId, parent.id),
    })

    expect(result).toEqual({ type: "soft" })
    expect(rereadParent?.deletedAt).toBeInstanceOf(Date)
    expect(remainingMessages).toHaveLength(0)
    expect(remainingLikes).toHaveLength(0)
  })

  it("deleteBiuSet hard-deletes a leaf set", async () => {
    const originalSetter = await seedUser({ name: "Original Setter" })
    const leafOwner = await seedUser({ name: "Leaf Owner" })
    const round = await seedRound()

    const parent = await seedBiuSet({
      assetId: "biu-hard-parent",
      position: 1,
      roundId: round.id,
      userId: originalSetter.id,
    })
    const leaf = await seedBiuSet({
      assetId: "biu-hard-leaf",
      parentSetId: parent.id,
      position: 2,
      roundId: round.id,
      userId: leafOwner.id,
    })

    const result = await deleteBiuSetImpl({
      ...asUser(leafOwner),
      data: {
        setId: leaf.id,
      },
    })

    const rereadLeaf = await db.query.biuSets.findFirst({
      where: (table, { eq }) => eq(table.id, leaf.id),
    })

    expect(result).toEqual({ type: "hard" })
    expect(rereadLeaf).toBeUndefined()
  })
})
