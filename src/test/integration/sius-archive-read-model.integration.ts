import { beforeEach, describe, expect, it } from "bun:test"

import { seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import {
  muxVideos,
  siuArchiveVotes,
  siuSetLikes,
  siuSetMessages,
  siuSets,
  sius,
} from "~/db/schema"
import {
  getArchivedRoundImpl,
  listArchivedRoundsImpl,
} from "~/lib/games/sius/fns"

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

describe("siu archive read-model integration", () => {
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

    const rounds = await listArchivedRoundsImpl()

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

    const round = await getArchivedRoundImpl({
      data: {
        roundId: archivedRound.id,
      },
    })
    const activeResult = await getArchivedRoundImpl({
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
