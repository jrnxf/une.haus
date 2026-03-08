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
  siuArchiveVotes,
  siuSetLikes,
  siuSetMessages,
  siuSets,
  sius,
  userFollows,
} from "~/db/schema"
import {
  addSiuSetImpl,
  archiveSiuRoundImpl,
  createFirstSiuSetImpl,
  deleteSiuSetImpl,
  removeArchiveVoteImpl,
  voteToArchiveImpl,
} from "~/lib/games/sius/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedActiveRound() {
  const [round] = await db.insert(sius).values({ status: "active" }).returning()

  return round
}

async function seedSiuSet(args: {
  roundId: number
  userId: number
  position: number
  parentSetId?: number | null
  assetId?: string
  name?: string
}) {
  const video = await seedMuxVideo(args.assetId)

  const [set] = await db
    .insert(siuSets)
    .values({
      muxAssetId: video.assetId,
      name: args.name ?? `Set ${args.position}`,
      parentSetId: args.parentSetId ?? null,
      position: args.position,
      siuId: args.roundId,
      userId: args.userId,
    })
    .returning()

  return set
}

describe("sius integration", () => {
  it("inserts the fifth archive vote and notifies all admins", async () => {
    const adminA = await seedUser({ name: "Admin A", type: "admin" })
    const adminB = await seedUser({ name: "Admin B", type: "admin" })
    const voter = await seedUser({ name: "Voter" })
    const latestSetter = await seedUser({ name: "Latest Setter" })

    const round = await seedActiveRound()
    await seedSiuSet({
      assetId: "asset-latest",
      name: "Latest Trick",
      position: 4,
      roundId: round.id,
      userId: latestSetter.id,
    })

    const existingVoters = await Promise.all([
      seedUser({ name: "Vote 1" }),
      seedUser({ name: "Vote 2" }),
      seedUser({ name: "Vote 3" }),
      seedUser({ name: "Vote 4" }),
    ])

    await db.insert(siuArchiveVotes).values(
      existingVoters.map((user) => ({
        siuId: round.id,
        userId: user.id,
      })),
    )

    const result = await voteToArchiveImpl({
      ...asUser(voter),
      data: {
        roundId: round.id,
      },
    })

    expect(result).toEqual({
      thresholdReached: true,
      voteCount: 5,
    })

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: voter.id,
          entityId: round.id,
          entityType: "siu",
          type: "archive_request",
          userId: adminA.id,
        }),
        expect.objectContaining({
          actorId: voter.id,
          entityId: round.id,
          entityType: "siu",
          type: "archive_request",
          userId: adminB.id,
        }),
      ]),
    )
  })

  it("does not re-notify admins on the sixth archive vote", async () => {
    await seedUser({ name: "Admin", type: "admin" })
    const voter = await seedUser({ name: "Voter" })
    const latestSetter = await seedUser({ name: "Latest Setter" })
    const round = await seedActiveRound()

    await seedSiuSet({
      assetId: "asset-sixth",
      position: 5,
      roundId: round.id,
      userId: latestSetter.id,
    })

    const existingVoters = await Promise.all([
      seedUser({ name: "Vote 1" }),
      seedUser({ name: "Vote 2" }),
      seedUser({ name: "Vote 3" }),
      seedUser({ name: "Vote 4" }),
      seedUser({ name: "Vote 5" }),
    ])

    await db.insert(siuArchiveVotes).values(
      existingVoters.map((user) => ({
        siuId: round.id,
        userId: user.id,
      })),
    )

    const result = await voteToArchiveImpl({
      ...asUser(voter),
      data: {
        roundId: round.id,
      },
    })

    expect(result).toEqual({
      thresholdReached: true,
      voteCount: 6,
    })
    expect(await db.query.notifications.findMany()).toHaveLength(0)
  })

  it("rejects duplicate archive votes and preserves the existing vote row", async () => {
    const voter = await seedUser({ name: "Voter" })
    const round = await seedActiveRound()

    await voteToArchiveImpl({
      ...asUser(voter),
      data: {
        roundId: round.id,
      },
    })

    await expect(
      voteToArchiveImpl({
        ...asUser(voter),
        data: {
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("You have already voted to archive this round")

    const votes = await db.query.siuArchiveVotes.findMany()
    expect(votes).toHaveLength(1)
    expect(votes[0]).toEqual(
      expect.objectContaining({
        siuId: round.id,
        userId: voter.id,
      }),
    )
  })

  it("removeArchiveVote deletes only the current user's vote and returns the updated count", async () => {
    const voter = await seedUser({ name: "Voter" })
    const otherVoter = await seedUser({ name: "Other Voter" })
    const round = await seedActiveRound()

    await db.insert(siuArchiveVotes).values([
      {
        siuId: round.id,
        userId: voter.id,
      },
      {
        siuId: round.id,
        userId: otherVoter.id,
      },
    ])

    const result = await removeArchiveVoteImpl({
      ...asUser(voter),
      data: {
        roundId: round.id,
      },
    })

    const votes = await db.query.siuArchiveVotes.findMany()

    expect(result).toEqual({ voteCount: 1 })
    expect(votes).toEqual([
      expect.objectContaining({
        siuId: round.id,
        userId: otherVoter.id,
      }),
    ])
  })

  it("archives an active round, sets endedAt, and notifies unique participants", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const participantA = await seedUser({ name: "Participant A" })
    const participantB = await seedUser({ name: "Participant B" })
    const round = await seedActiveRound()

    await seedSiuSet({
      assetId: "asset-archive-1",
      position: 1,
      roundId: round.id,
      userId: participantA.id,
    })
    await seedSiuSet({
      assetId: "asset-archive-2",
      position: 2,
      roundId: round.id,
      userId: participantB.id,
    })
    await seedSiuSet({
      assetId: "asset-archive-3",
      position: 3,
      roundId: round.id,
      userId: participantA.id,
    })

    await expect(
      archiveSiuRoundImpl({
        ...asUser(admin),
        data: {
          roundId: round.id,
        },
      }),
    ).resolves.toEqual({ success: true })

    const rereadRound = await db.query.sius.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, round.id),
    })
    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.userId)],
    })

    expect(rereadRound?.status).toBe("archived")
    expect(rereadRound?.endedAt).toBeInstanceOf(Date)
    expect(rows.map((row) => row.userId)).toEqual([
      participantA.id,
      participantB.id,
    ])
    expect(rows.every((row) => row.type === "chain_archived")).toBe(true)
  })

  it("rejects archiving a round that is already archived", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const [round] = await db
      .insert(sius)
      .values({
        endedAt: new Date("2024-01-01T00:00:00Z"),
        status: "archived",
      })
      .returning()

    await expect(
      archiveSiuRoundImpl({
        ...asUser(admin),
        data: {
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("Round is already archived")
  })

  it("createFirstSiuSet creates the first set, creates optional instructions, and rejects a second first set", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })
    const firstVideo = await seedMuxVideo("asset-first")
    const secondVideo = await seedMuxVideo("asset-second")
    const round = await seedActiveRound()

    const set = await createFirstSiuSetImpl({
      ...asUser(owner),
      data: {
        instructions: "  do this first  ",
        muxAssetId: firstVideo.assetId,
        name: "First Set",
        roundId: round.id,
      },
    })

    await expect(
      createFirstSiuSetImpl({
        ...asUser(otherUser),
        data: {
          muxAssetId: secondVideo.assetId,
          name: "Second First Set",
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("Round already has a first set")

    const messages = await db.query.siuSetMessages.findMany()

    expect(set).toEqual(
      expect.objectContaining({
        name: "First Set",
        parentSetId: null,
        position: 1,
        siuId: round.id,
        userId: owner.id,
      }),
    )
    expect(messages).toEqual([
      expect.objectContaining({
        content: "do this first",
        siuSetId: set.id,
        userId: owner.id,
      }),
    ])
  })

  it("createFirstSiuSet serializes concurrent attempts so only one first set is created", async () => {
    const userA = await seedUser({ name: "User A" })
    const userB = await seedUser({ name: "User B" })
    const videoA = await seedMuxVideo("asset-lock-a")
    const videoB = await seedMuxVideo("asset-lock-b")
    const round = await seedActiveRound()

    const results = await Promise.allSettled([
      createFirstSiuSetImpl({
        ...asUser(userA),
        data: {
          muxAssetId: videoA.assetId,
          name: "First A",
          roundId: round.id,
        },
      }),
      createFirstSiuSetImpl({
        ...asUser(userB),
        data: {
          muxAssetId: videoB.assetId,
          name: "First B",
          roundId: round.id,
        },
      }),
    ])

    const sets = await db.query.siuSets.findMany()

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1)
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1)
    expect(sets).toHaveLength(1)
    expect(sets[0]?.position).toBe(1)
  })

  it("addSiuSet uses the latest set, creates instructions, increments position, and notifies followers", async () => {
    const originalSetter = await seedUser({ name: "Original Setter" })
    const latestSetter = await seedUser({ name: "Latest Setter" })
    const actor = await seedUser({ name: "Actor" })
    const follower = await seedUser({ name: "Follower" })
    const round = await seedActiveRound()

    await db.insert(userFollows).values({
      followedByUserId: follower.id,
      followedUserId: actor.id,
    })

    await seedSiuSet({
      assetId: "asset-add-1",
      position: 1,
      roundId: round.id,
      userId: originalSetter.id,
    })
    const latestSet = await seedSiuSet({
      assetId: "asset-add-2",
      position: 2,
      roundId: round.id,
      userId: latestSetter.id,
    })
    const nextVideo = await seedMuxVideo("asset-add-3")

    const set = await addSiuSetImpl({
      ...asUser(actor),
      data: {
        instructions: "  stack this line  ",
        muxAssetId: nextVideo.assetId,
        name: "Third Trick",
        roundId: round.id,
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(1)
    })

    const messages = await db.query.siuSetMessages.findMany()
    const [notification] = await db.query.notifications.findMany()

    expect(set).toEqual(
      expect.objectContaining({
        name: "Third Trick",
        parentSetId: latestSet.id,
        position: 3,
        siuId: round.id,
        userId: actor.id,
      }),
    )
    expect(messages).toEqual([
      expect.objectContaining({
        content: "stack this line",
        siuSetId: set.id,
        userId: actor.id,
      }),
    ])
    expect(notification).toEqual(
      expect.objectContaining({
        actorId: actor.id,
        entityId: set.id,
        entityType: "siuSet",
        type: "new_content",
        userId: follower.id,
      }),
    )
  })

  it("addSiuSet rejects continuing your own latest set", async () => {
    const actor = await seedUser({ name: "Actor" })
    const round = await seedActiveRound()

    await seedSiuSet({
      assetId: "asset-self",
      position: 1,
      roundId: round.id,
      userId: actor.id,
    })
    const video = await seedMuxVideo("asset-self-next")

    await expect(
      addSiuSetImpl({
        ...asUser(actor),
        data: {
          muxAssetId: video.assetId,
          name: "Nope",
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("You cannot stack up your own trick")
  })

  it("addSiuSet rejects adding another child when the latest set is already continued", async () => {
    const latestSetter = await seedUser({ name: "Latest Setter" })
    const childSetter = await seedUser({ name: "Child Setter" })
    const actor = await seedUser({ name: "Actor" })
    const round = await seedActiveRound()

    const latestSet = await seedSiuSet({
      assetId: "asset-dup-parent",
      position: 5,
      roundId: round.id,
      userId: latestSetter.id,
    })
    await seedSiuSet({
      assetId: "asset-dup-child",
      parentSetId: latestSet.id,
      position: 4,
      roundId: round.id,
      userId: childSetter.id,
    })
    const video = await seedMuxVideo("asset-dup-next")

    await expect(
      addSiuSetImpl({
        ...asUser(actor),
        data: {
          muxAssetId: video.assetId,
          name: "Duplicate Child",
          roundId: round.id,
        },
      }),
    ).rejects.toThrow("This set has already been continued")
  })

  it("soft-deletes a continued set and removes engagement data", async () => {
    const owner = await seedUser({ name: "Owner" })
    const childUser = await seedUser({ name: "Child User" })
    const liker = await seedUser({ name: "Liker" })
    const round = await seedActiveRound()

    const parent = await seedSiuSet({
      assetId: "asset-owner",
      name: "Parent",
      position: 1,
      roundId: round.id,
      userId: owner.id,
    })

    await seedSiuSet({
      assetId: "asset-child",
      name: "Child",
      parentSetId: parent.id,
      position: 2,
      roundId: round.id,
      userId: childUser.id,
    })

    await db.insert(siuSetMessages).values({
      content: "instructions",
      siuSetId: parent.id,
      userId: owner.id,
    })

    await db.insert(siuSetLikes).values({
      siuSetId: parent.id,
      userId: liker.id,
    })

    const result = await deleteSiuSetImpl({
      ...asUser(owner),
      data: {
        setId: parent.id,
      },
    })

    expect(result).toEqual({ type: "soft" })

    const rereadParent = await db.query.siuSets.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, parent.id),
    })
    const remainingMessages = await db.query.siuSetMessages.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.siuSetId, parent.id),
    })
    const remainingLikes = await db.query.siuSetLikes.findMany({
      where: (table, { eq: eqOp }) => eqOp(table.siuSetId, parent.id),
    })

    expect(rereadParent?.deletedAt).toBeInstanceOf(Date)
    expect(remainingMessages).toHaveLength(0)
    expect(remainingLikes).toHaveLength(0)
  })

  it("hard-deletes a leaf set without archiving a round that still has other sets", async () => {
    const originalSetter = await seedUser({ name: "Original Setter" })
    const leafOwner = await seedUser({ name: "Leaf Owner" })
    const round = await seedActiveRound()

    const parent = await seedSiuSet({
      assetId: "asset-hard-parent",
      position: 1,
      roundId: round.id,
      userId: originalSetter.id,
    })
    const leaf = await seedSiuSet({
      assetId: "asset-hard-leaf",
      parentSetId: parent.id,
      position: 2,
      roundId: round.id,
      userId: leafOwner.id,
    })

    const result = await deleteSiuSetImpl({
      ...asUser(leafOwner),
      data: {
        setId: leaf.id,
      },
    })

    const rereadLeaf = await db.query.siuSets.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, leaf.id),
    })
    const rereadRound = await db.query.sius.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, round.id),
    })

    expect(result).toEqual({ type: "hard" })
    expect(rereadLeaf).toBeUndefined()
    expect(rereadRound?.status).toBe("active")
  })

  it("hard-deleting the first and only set archives the round", async () => {
    const owner = await seedUser({ name: "Owner" })
    const round = await seedActiveRound()
    const onlySet = await seedSiuSet({
      assetId: "asset-only",
      position: 1,
      roundId: round.id,
      userId: owner.id,
    })

    const result = await deleteSiuSetImpl({
      ...asUser(owner),
      data: {
        setId: onlySet.id,
      },
    })

    const rereadRound = await db.query.sius.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, round.id),
    })
    const rereadSet = await db.query.siuSets.findFirst({
      where: (table, { eq: eqOp }) => eqOp(table.id, onlySet.id),
    })

    expect(result).toEqual({ type: "hard" })
    expect(rereadSet).toBeUndefined()
    expect(rereadRound?.status).toBe("archived")
    expect(rereadRound?.endedAt).toBeInstanceOf(Date)
  })
})
