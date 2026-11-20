import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { biuSets, bius, chatMessages, posts, riuSets, rius } from "~/db/schema"
import { getHomeBoard, getHomeHero } from "~/lib/home/ops.server"
import {
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
} from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

async function seedRiu(status: "active" | "archived" | "upcoming") {
  const [riu] = await db.insert(rius).values({ status }).returning()
  return riu
}

async function seedRiuSet(riuId: number, userId: number, name: string) {
  const video = await seedMuxVideo()
  await db
    .insert(riuSets)
    .values({ muxAssetId: video.assetId, name, riuId, userId })
  return { playbackId: String(video.playbackId) }
}

async function seedBiuSet(args: {
  biuId: number
  deletedAt?: Date
  name: string
  position: number
  userId: number
}) {
  const video = await seedMuxVideo()
  await db.insert(biuSets).values({ ...args, muxAssetId: video.assetId })
  return { playbackId: String(video.playbackId) }
}

describe("home board hero", () => {
  it("shows the active rack it up round when it has sets", async () => {
    const rider = await seedUser({ name: "Rider" })
    const active = await seedRiu("active")
    const video = await seedRiuSet(active.id, rider.id, "first set")
    await seedRiuSet(active.id, rider.id, "second set")
    const [chain] = await db.insert(bius).values({}).returning()
    await seedBiuSet({
      biuId: chain.id,
      name: "chain trick",
      position: 1,
      userId: rider.id,
    })

    expect(await getHomeHero()).toEqual({
      kind: "riu",
      playbackId: video.playbackId,
      riuId: active.id,
      sets: [
        { id: expect.any(Number), name: "first set", rider: "Rider" },
        { id: expect.any(Number), name: "second set", rider: "Rider" },
      ],
    })
  })

  it("shows the newest back it up trick when the active round has no sets", async () => {
    const rider = await seedUser({ name: "Rider" })
    await seedRiu("active")
    const archived = await seedRiu("archived")
    await seedRiuSet(archived.id, rider.id, "old set")
    const [chain] = await db.insert(bius).values({}).returning()
    await seedBiuSet({
      biuId: chain.id,
      name: "backed up trick",
      position: 1,
      userId: rider.id,
    })
    const head = await seedBiuSet({
      biuId: chain.id,
      name: "trick to back up",
      position: 2,
      userId: rider.id,
    })

    expect(await getHomeHero()).toEqual({
      biuId: chain.id,
      kind: "biu",
      playbackId: head.playbackId,
      rider: "Rider",
      trick: "trick to back up",
    })
  })

  it("skips a chain whose last set is deleted", async () => {
    const rider = await seedUser({ name: "Rider" })
    await seedRiu("active")
    const [chain] = await db.insert(bius).values({}).returning()
    await seedBiuSet({
      biuId: chain.id,
      name: "earlier trick",
      position: 1,
      userId: rider.id,
    })
    await seedBiuSet({
      biuId: chain.id,
      deletedAt: new Date(),
      name: "deleted trick",
      position: 2,
      userId: rider.id,
    })

    expect(await getHomeHero()).toBeNull()
  })

  it("shows the last finished round when no game has a trick to play", async () => {
    const rider = await seedUser({ name: "Rider" })
    await seedRiu("active")
    const older = await seedRiu("archived")
    await seedRiuSet(older.id, rider.id, "older set")
    const last = await seedRiu("archived")
    const video = await seedRiuSet(last.id, rider.id, "last set")
    // A finished round with no sets is skipped.
    await seedRiu("archived")

    expect(await getHomeHero()).toEqual({
      kind: "lastRiu",
      playbackId: video.playbackId,
      riuId: last.id,
      sets: [{ id: expect.any(Number), name: "last set", rider: "Rider" }],
    })
  })

  it("has no hero when nothing has a video", async () => {
    await seedRiu("active")
    await seedRiu("upcoming")

    expect(await getHomeHero()).toBeNull()
  })
})

describe("home board teasers", () => {
  it("returns the three newest chat messages, oldest first, and the three newest posts", async () => {
    const rider = await seedUser({ name: "Rider" })
    for (const content of ["one", "two", "three", "four"]) {
      await db.insert(chatMessages).values({ content, userId: rider.id })
      await db
        .insert(posts)
        .values({ content, title: `post ${content}`, userId: rider.id })
    }

    const board = await getHomeBoard()

    expect(board.hero).toBeNull()
    expect(board.chat.map((message) => message.content)).toEqual([
      "two",
      "three",
      "four",
    ])
    expect(board.chat[0]?.user).toEqual({ avatarId: null, name: "Rider" })
    expect(board.posts.map((post) => post.title)).toEqual([
      "post four",
      "post three",
      "post two",
    ])
  })
})
