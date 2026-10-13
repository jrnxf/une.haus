import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  biuSets,
  bius,
  chatMessages,
  muxVideos,
  riuSets,
  riuSubmissions,
  rius,
  siuSets,
  sius,
  tricks,
  trickVideos,
  utvVideos,
} from "~/db/schema"
import { computeHomeLatest } from "~/lib/home/ops.server"
import { STALE_AFTER_MS } from "~/lib/home/slots"
import {
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
} from "~/testing/integration"

const now = new Date("2026-10-13T12:00:00Z")
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60 * 1000)
const longAgo = new Date(now.getTime() - STALE_AFTER_MS * 4)

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedRound(status: "active" | "archived" | "upcoming") {
  const [round] = await db.insert(rius).values({ status }).returning()
  return round
}

async function seedRiuSet({
  roundId,
  userId,
  name,
  createdAt,
}: {
  roundId: number
  userId: number
  name: string
  createdAt: Date
}) {
  const video = await seedMuxVideo()
  const [set] = await db
    .insert(riuSets)
    .values({
      riuId: roundId,
      userId,
      name,
      muxAssetId: video.assetId,
      createdAt,
    })
    .returning()
  return set
}

async function seedUnprocessedVideo(assetId: string) {
  const [video] = await db
    .insert(muxVideos)
    .values({ assetId, playbackId: null })
    .returning()
  return video
}

async function seedVaultClip(title: string, video?: { assetId: string }) {
  video ??= await seedMuxVideo()
  const [clip] = await db
    .insert(utvVideos)
    .values({
      legacyUrl: `https://unicycle.tv/${title}`,
      legacyTitle: title,
      title,
      muxAssetId: video.assetId,
    })
    .returning()
  return clip
}

describe("home latest", () => {
  it("fills what it can from an empty database without throwing", async () => {
    const latest = await computeHomeLatest(now)

    expect(latest.lead).toBeNull()
    expect(latest.games).toBeNull()
    expect(latest.rider).toBeNull()
    expect(latest.post).toBeNull()
    expect(latest.talk).toEqual({ kind: "arcade" })
    expect(latest.trick).toBeNull()
    expect(latest.vault).toBeNull()
  })

  it("has no games slot between rounds instead of an error", async () => {
    const rider = await seedUser()
    const archived = await seedRound("archived")
    await seedRound("upcoming")
    await seedRiuSet({
      roundId: archived.id,
      userId: rider.id,
      name: "old set",
      createdAt: minutesAgo(5),
    })

    const latest = await computeHomeLatest(now)

    expect(latest.games).toBeNull()
    expect(latest.lead?.title).toBe("old set")
  })

  it("never shows a set from the upcoming round", async () => {
    const rider = await seedUser()
    const active = await seedRound("active")
    const upcoming = await seedRound("upcoming")
    await seedRiuSet({
      roundId: active.id,
      userId: rider.id,
      name: "public set",
      createdAt: minutesAgo(60),
    })
    await seedRiuSet({
      roundId: upcoming.id,
      userId: rider.id,
      name: "private set",
      createdAt: minutesAgo(1),
    })

    const latest = await computeHomeLatest(now)

    expect(latest.lead).toMatchObject({ kind: "riuSet", title: "public set" })
    expect(JSON.stringify(latest)).not.toContain("private set")
  })

  it("leaves out deleted sets and unapproved trick videos", async () => {
    const rider = await seedUser()
    const [chain] = await db.insert(bius).values({}).returning()
    const deleted = await seedMuxVideo()
    await db.insert(biuSets).values({
      biuId: chain.id,
      userId: rider.id,
      name: "deleted set",
      position: 1,
      muxAssetId: deleted.assetId,
      createdAt: minutesAgo(1),
      deletedAt: minutesAgo(1),
    })
    const [trick] = await db
      .insert(tricks)
      .values({ name: "pending trick", createdAt: longAgo })
      .returning()
    const pending = await seedMuxVideo()
    await db.insert(trickVideos).values({
      trickId: trick.id,
      muxAssetId: pending.assetId,
      submittedByUserId: rider.id,
      status: "pending",
      createdAt: minutesAgo(2),
    })

    const latest = await computeHomeLatest(now)

    expect(latest.lead).toBeNull()
  })

  it("leaves out videos that have not finished processing", async () => {
    const rider = await seedUser()
    const active = await seedRound("active")
    const [riuSet] = await db
      .insert(riuSets)
      .values({
        riuId: active.id,
        userId: rider.id,
        name: "unprocessed riu set",
        muxAssetId: (await seedUnprocessedVideo("riu-set")).assetId,
        createdAt: minutesAgo(5),
      })
      .returning()
    await db.insert(riuSubmissions).values({
      riuSetId: riuSet.id,
      userId: rider.id,
      muxAssetId: (await seedUnprocessedVideo("riu-submission")).assetId,
      createdAt: minutesAgo(4),
    })
    const [chain] = await db.insert(bius).values({}).returning()
    await db.insert(biuSets).values({
      biuId: chain.id,
      userId: rider.id,
      name: "unprocessed biu set",
      position: 1,
      muxAssetId: (await seedUnprocessedVideo("biu-set")).assetId,
      createdAt: minutesAgo(3),
    })
    const [stack] = await db.insert(sius).values({}).returning()
    await db.insert(siuSets).values({
      siuId: stack.id,
      userId: rider.id,
      name: "unprocessed siu set",
      position: 1,
      muxAssetId: (await seedUnprocessedVideo("siu-set")).assetId,
      createdAt: minutesAgo(2),
    })
    const [trick] = await db
      .insert(tricks)
      .values({ name: "unprocessed trick", createdAt: longAgo })
      .returning()
    await db.insert(trickVideos).values({
      trickId: trick.id,
      muxAssetId: (await seedUnprocessedVideo("trick-video")).assetId,
      submittedByUserId: rider.id,
      status: "active",
      createdAt: minutesAgo(1),
    })
    await seedVaultClip(
      "unprocessed clip",
      await seedUnprocessedVideo("vault-clip"),
    )

    const latest = await computeHomeLatest(now)

    expect(latest.lead).toBeNull()
    expect(latest.vault).toBeNull()
  })

  it("ranks the active round's podium", async () => {
    const leader = await seedUser({ name: "leader" })
    const chaser = await seedUser({ name: "chaser" })
    const active = await seedRound("active")
    const set = await seedRiuSet({
      roundId: active.id,
      userId: leader.id,
      name: "set one",
      createdAt: minutesAgo(30),
    })
    await seedRiuSet({
      roundId: active.id,
      userId: leader.id,
      name: "set two",
      createdAt: minutesAgo(20),
    })
    const answer = await seedMuxVideo()
    await db.insert(riuSubmissions).values({
      riuSetId: set.id,
      userId: chaser.id,
      muxAssetId: answer.assetId,
      createdAt: minutesAgo(10),
    })

    const latest = await computeHomeLatest(now)

    expect(latest.games?.leaders.map((rider) => rider.name)).toEqual([
      "leader",
      "chaser",
    ])
  })

  it("swaps stale slots for the archive without saying so", async () => {
    const veteran = await seedUser({
      name: "veteran",
      avatarId: "avatar-1",
      createdAt: longAgo,
    })
    const round = await seedRound("archived")
    await seedRiuSet({
      roundId: round.id,
      userId: veteran.id,
      name: "stale set",
      createdAt: longAgo,
    })
    await seedVaultClip("vault one")
    await seedVaultClip("vault two")
    await db.insert(tricks).values({ name: "treyflip", createdAt: longAgo })
    await db.insert(chatMessages).values({
      content: "anyone riding?",
      userId: veteran.id,
      createdAt: longAgo,
    })

    const latest = await computeHomeLatest(now)

    expect(latest.lead?.kind).toBe("vault")
    expect(latest.vault).not.toBeNull()
    expect(latest.vault?.id).not.toBe(latest.lead?.id)
    expect(latest.rider).toMatchObject({
      isNew: false,
      user: { name: "veteran" },
    })
    expect(latest.trick).toMatchObject({ isNew: false, name: "treyflip" })
    expect(latest.talk).toEqual({ kind: "arcade" })
  })

  it("shows fresh things as new and keeps the chat line", async () => {
    const newcomer = await seedUser({
      name: "newcomer",
      createdAt: minutesAgo(30),
    })
    await seedVaultClip("vault one")
    await db
      .insert(tricks)
      .values({ name: "sidespin late flip", createdAt: minutesAgo(30) })
    await db.insert(chatMessages).values({
      content: "anyone riding?",
      userId: newcomer.id,
      createdAt: minutesAgo(3),
    })

    const latest = await computeHomeLatest(now)

    expect(latest.rider).toMatchObject({
      isNew: true,
      user: { name: "newcomer" },
    })
    expect(latest.trick).toMatchObject({
      isNew: true,
      name: "sidespin late flip",
    })
    expect(latest.talk).toMatchObject({
      kind: "chat",
      content: "anyone riding?",
    })
    // no fresh rider video, so the only vault clip leads and is not repeated
    expect(latest.lead?.kind).toBe("vault")
    expect(latest.vault).toBeNull()
  })

  it("carries no timestamps to the page", async () => {
    const rider = await seedUser({ createdAt: minutesAgo(30) })
    const active = await seedRound("active")
    await seedRiuSet({
      roundId: active.id,
      userId: rider.id,
      name: "fresh set",
      createdAt: minutesAgo(5),
    })
    await db.insert(chatMessages).values({
      content: "hello",
      userId: rider.id,
      createdAt: minutesAgo(3),
    })

    const latest = await computeHomeLatest(now)

    expect(JSON.stringify(latest)).not.toMatch(/createdAt|\d{4}-\d{2}-\d{2}T/)
  })
})
