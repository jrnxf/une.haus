import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  muxVideos,
  siuArchiveVotes,
  siuSetLikes,
  siuSetMessages,
  siuSets,
  sius,
  userFollows,
} from "~/db/schema"
import {
  addSiuSet,
  archiveSiuRound,
  createFirstSiuSet,
  deleteSiuSet,
  getArchivedRound,
  listArchivedRounds,
  removeArchiveVote,
  voteToArchive,
} from "~/lib/games/sius/ops.server"
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

async function seedMux(assetId: string) {
  const [video] = await db
    .insert(muxVideos)
    .values({
      assetId,
      playbackId: `playback-${assetId}`,
    })
    .returning()

  return video
}

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

    const result = await voteToArchive({
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

    const result = await voteToArchive({
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

    await voteToArchive({
      ...asUser(voter),
      data: {
        roundId: round.id,
      },
    })

    await expect(
      voteToArchive({
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

    const result = await removeArchiveVote({
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
      archiveSiuRound({
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
      archiveSiuRound({
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

    const set = await createFirstSiuSet({
      ...asUser(owner),
      data: {
        instructions: "  do this first  ",
        muxAssetId: firstVideo.assetId,
        name: "First Set",
        roundId: round.id,
      },
    })

    await expect(
      createFirstSiuSet({
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
      createFirstSiuSet({
        ...asUser(userA),
        data: {
          muxAssetId: videoA.assetId,
          name: "First A",
          roundId: round.id,
        },
      }),
      createFirstSiuSet({
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

    const set = await addSiuSet({
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
      addSiuSet({
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
      addSiuSet({
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

    const result = await deleteSiuSet({
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

    const result = await deleteSiuSet({
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

    const result = await deleteSiuSet({
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

  it("listArchivedRounds orders by endedAt and excludes deleted sets from setsCount", async () => {
    const user = await seedUser({ name: "Setter" })
    const olderVideo = await seedMux("older-video")
    const newerVideo = await seedMux("newer-video")
    const activeVideo = await seedMux("active-video")

    const [olderArchived, newerArchived, activeRound] = await db
      .insert(sius)
      .values([
        {
          createdAt: new Date("2024-01-01T09:00:00Z"),
          endedAt: new Date("2024-01-03T10:00:00Z"),
          status: "archived",
        },
        {
          createdAt: new Date("2024-01-02T09:00:00Z"),
          endedAt: new Date("2024-01-04T10:00:00Z"),
          status: "archived",
        },
        {
          createdAt: new Date("2024-01-05T09:00:00Z"),
          status: "active",
        },
      ])
      .returning()

    await db.insert(siuSets).values([
      {
        muxAssetId: olderVideo.assetId,
        name: "Older Counted Set",
        parentSetId: null,
        position: 1,
        siuId: olderArchived.id,
        userId: user.id,
      },
      {
        deletedAt: new Date("2024-01-03T11:00:00Z"),
        muxAssetId: olderVideo.assetId,
        name: "Older Deleted Set",
        parentSetId: null,
        position: 2,
        siuId: olderArchived.id,
        userId: user.id,
      },
      {
        muxAssetId: newerVideo.assetId,
        name: "Newer Counted Set A",
        parentSetId: null,
        position: 1,
        siuId: newerArchived.id,
        userId: user.id,
      },
      {
        muxAssetId: newerVideo.assetId,
        name: "Newer Counted Set B",
        parentSetId: null,
        position: 2,
        siuId: newerArchived.id,
        userId: user.id,
      },
      {
        muxAssetId: activeVideo.assetId,
        name: "Active Set",
        parentSetId: null,
        position: 1,
        siuId: activeRound.id,
        userId: user.id,
      },
    ])

    const rounds = await listArchivedRounds()

    expect(rounds).toEqual([
      expect.objectContaining({
        id: newerArchived.id,
        setsCount: 2,
      }),
      expect.objectContaining({
        id: olderArchived.id,
        setsCount: 1,
      }),
    ])
  })

  it("getArchivedRound returns the nested archived round graph and null for active rounds", async () => {
    const setter = await seedUser({ name: "Setter" })
    const childSetter = await seedUser({ name: "Child Setter" })
    const liker = await seedUser({ name: "Liker" })
    const voter = await seedUser({ name: "Voter" })
    const parentVideo = await seedMux("parent-video")
    const childVideo = await seedMux("child-video")
    const activeVideo = await seedMux("active-video")

    const [archivedRound, activeRound] = await db
      .insert(sius)
      .values([
        {
          endedAt: new Date("2024-02-01T10:00:00Z"),
          status: "archived",
        },
        {
          status: "active",
        },
      ])
      .returning()

    const [parentSet] = await db
      .insert(siuSets)
      .values({
        muxAssetId: parentVideo.assetId,
        name: "Parent Set",
        parentSetId: null,
        position: 1,
        siuId: archivedRound.id,
        userId: setter.id,
      })
      .returning()

    const [childSet] = await db
      .insert(siuSets)
      .values({
        muxAssetId: childVideo.assetId,
        name: "Child Set",
        parentSetId: parentSet.id,
        position: 2,
        siuId: archivedRound.id,
        userId: childSetter.id,
      })
      .returning()

    await db.insert(siuSetLikes).values({
      siuSetId: childSet.id,
      userId: liker.id,
    })
    await db.insert(siuSetMessages).values({
      content: "archived message",
      siuSetId: childSet.id,
      userId: setter.id,
    })
    await db.insert(siuArchiveVotes).values({
      siuId: archivedRound.id,
      userId: voter.id,
    })
    await db.insert(siuSets).values({
      muxAssetId: activeVideo.assetId,
      name: "Active Set",
      parentSetId: null,
      position: 1,
      siuId: activeRound.id,
      userId: setter.id,
    })

    const round = await getArchivedRound({
      data: {
        roundId: archivedRound.id,
      },
    })
    const activeResult = await getArchivedRound({
      data: {
        roundId: activeRound.id,
      },
    })

    expect(activeResult).toBeNull()
    expect(round).toEqual(
      expect.objectContaining({
        id: archivedRound.id,
        status: "archived",
      }),
    )
    expect(round?.archiveVotes).toEqual([
      expect.objectContaining({
        siuId: archivedRound.id,
        user: expect.objectContaining({
          id: voter.id,
          name: voter.name,
        }),
        userId: voter.id,
      }),
    ])
    expect(round?.sets).toHaveLength(2)
    expect(round?.sets[0]).toEqual(
      expect.objectContaining({
        id: childSet.id,
        name: "Child Set",
        parentSet: expect.objectContaining({
          id: parentSet.id,
          name: "Parent Set",
          user: expect.objectContaining({
            id: setter.id,
            name: setter.name,
          }),
        }),
        user: expect.objectContaining({
          id: childSetter.id,
          name: childSetter.name,
        }),
        video: expect.objectContaining({
          playbackId: childVideo.playbackId,
        }),
      }),
    )
    expect(round?.sets[0]?.likes).toEqual([
      expect.objectContaining({
        siuSetId: childSet.id,
        user: expect.objectContaining({
          id: liker.id,
          name: liker.name,
        }),
        userId: liker.id,
      }),
    ])
    expect(round?.sets[0]?.messages).toEqual([
      expect.objectContaining({
        id: expect.any(Number),
      }),
    ])
  })
})
