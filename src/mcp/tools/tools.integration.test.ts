import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  biuSetMessages,
  biuSets,
  bius,
  posts,
  riuSets,
  riuSubmissions,
  rius,
  siuSets,
  sius,
  trickRelationships,
  trickVideos,
  tricks,
  utvVideoLikes,
  utvVideoMessages,
  utvVideoRiders,
  utvVideos,
} from "~/db/schema"
import { getStatsTool, recentActivityTool } from "~/mcp/tools/activity"
import { getChainRoundTool, getChainSetTool } from "~/mcp/tools/chains"
import { type Tool, ToolError } from "~/mcp/tools/define"
import {
  getRiuRoundTool,
  getRiuSetTool,
  listSubmissionsTool,
} from "~/mcp/tools/games"
import { getPostTool, listPostsTool } from "~/mcp/tools/posts"
import { readTools } from "~/mcp/tools/registry"
import { listRoundsTool } from "~/mcp/tools/rounds"
import { searchUsersTool, searchVideosTool } from "~/mcp/tools/search"
import { getTrickTool } from "~/mcp/tools/tricks"
import { getUserTool } from "~/mcp/tools/users"
import { getVideoTool } from "~/mcp/tools/videos"
import {
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
} from "~/testing/integration"

import type { z } from "zod"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("shared MCP tools", () => {
  it("have unique names", () => {
    const names = readTools.map((tool) => tool.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("get_user returns a profile that matches its schema, with no email", async () => {
    const user = await seedUser({ name: "Ada Rider" })
    if (!user) throw new Error("seed failed")

    const out = await getUserTool.run(db, { userId: user.id })

    expect(getUserTool.outputSchema.parse(out)).toBeTruthy()
    expect(out.name).toBe("Ada Rider")
    expect(out).not.toHaveProperty("email")
  })

  it("get_user throws a ToolError for a missing id", async () => {
    expect(getUserTool.run(db, { userId: 999_999 })).rejects.toBeInstanceOf(
      ToolError,
    )
  })

  it("search_users finds a rider by part of the name", async () => {
    await seedUser({ name: "Ada Rider" })
    await seedUser({ name: "Bo Other" })

    const out = await searchUsersTool.run(db, { q: "ada", limit: 10 })

    expect(out.users.map((u) => u.name)).toEqual(["Ada Rider"])
  })

  it("list_posts pages with nextBefore, and get_post reads one", async () => {
    const user = await seedUser()
    if (!user) throw new Error("seed failed")
    for (const title of ["first", "second", "third"]) {
      await db.insert(posts).values({ title, content: title, userId: user.id })
    }

    const page1 = await listPostsTool.run(db, { limit: 2 })
    expect(page1.posts.map((p) => p.title)).toEqual(["third", "second"])
    expect(page1.nextBefore).not.toBeNull()

    const page2 = await listPostsTool.run(db, {
      limit: 2,
      before: page1.nextBefore ?? undefined,
    })
    expect(page2.posts.map((p) => p.title)).toEqual(["first"])
    expect(page2.nextBefore).toBeNull()

    const firstId = page2.posts[0]?.id ?? 0
    const post = await getPostTool.run(db, { postId: firstId })
    expect(getPostTool.outputSchema.parse(post).title).toBe("first")
  })
})

// Runs a tool, checks the result against its own outputSchema, and checks
// that no seeded email address or "email" key reaches the output.
async function runChecked<I extends z.ZodObject, O extends z.ZodObject>(
  tool: Tool<I, O>,
  input: z.input<I>,
) {
  const out = await tool.run(db, tool.inputSchema.parse(input))
  const parsed = tool.outputSchema.parse(out)
  const text = JSON.stringify(out)
  expect(text).not.toContain("@example.com")
  expect(text).not.toMatch(/"email"/i)
  return parsed as z.output<O>
}

async function seedSet<T extends typeof biuSets | typeof siuSets>(
  table: T,
  values: {
    roundId: number
    userId: number
    position: number
    name: string
    parentSetId?: number | null
    deletedAt?: Date
  },
) {
  const video = await seedMuxVideo()
  const round =
    table === biuSets ? { biuId: values.roundId } : { siuId: values.roundId }
  const [set] = await db
    .insert(table)
    .values({
      ...round,
      userId: values.userId,
      muxAssetId: video.assetId,
      name: values.name,
      position: values.position,
      parentSetId: values.parentSetId ?? null,
      deletedAt: values.deletedAt ?? null,
    } as never)
    .returning({ id: table.id })
  if (!set) throw new Error("seed failed")
  return set
}

async function seedRiuSet(roundId: number, userId: number, name: string) {
  const video = await seedMuxVideo()
  const [set] = await db
    .insert(riuSets)
    .values({ riuId: roundId, userId, name, muxAssetId: video.assetId })
    .returning()
  if (!set) throw new Error("seed failed")
  return set
}

async function seedRiders() {
  const ada = await seedUser({ name: "Ada Rider" })
  const bo = await seedUser({ name: "Bo Rider" })
  if (!ada || !bo) throw new Error("seed failed")
  return { ada, bo }
}

describe("RIU roster privacy", () => {
  it("get_riu_round refuses the upcoming round, by name and by id", async () => {
    const { ada } = await seedRiders()
    const [upcoming] = await db
      .insert(rius)
      .values({ status: "upcoming" })
      .returning()
    if (!upcoming) throw new Error("seed failed")
    await seedRiuSet(upcoming.id, ada.id, "secret set")

    for (const round of ["upcoming", upcoming.id] as const) {
      const error = await getRiuRoundTool
        .run(db, { round })
        .catch((err: unknown) => err)
      expect(error).toBeInstanceOf(ToolError)
      expect(String(error)).toContain("private until the round starts")
    }
  })

  it("get_riu_set refuses a set in the upcoming round, and reads an active one", async () => {
    const { ada, bo } = await seedRiders()
    const [upcoming] = await db
      .insert(rius)
      .values({ status: "upcoming" })
      .returning()
    const [active] = await db
      .insert(rius)
      .values({ status: "active" })
      .returning()
    if (!upcoming || !active) throw new Error("seed failed")
    const secret = await seedRiuSet(upcoming.id, ada.id, "secret set")
    const open = await seedRiuSet(active.id, ada.id, "open set")
    const video = await seedMuxVideo()
    await db.insert(riuSubmissions).values({
      riuSetId: open.id,
      userId: bo.id,
      muxAssetId: video.assetId,
    })

    expect(getRiuSetTool.run(db, { setId: secret.id })).rejects.toBeInstanceOf(
      ToolError,
    )

    const set = await runChecked(getRiuSetTool, { setId: open.id })
    expect(set.submissions.map((s) => s.rider.name)).toEqual(["Bo Rider"])
    const round = await runChecked(getRiuRoundTool, { round: "active" })
    expect(round.sets.map((s) => s.name)).toEqual(["open set"])
  })
})

describe("chain game tools", () => {
  it("list, read and walk a BIU chain, with deleted sets left out", async () => {
    const { ada, bo } = await seedRiders()
    const [round] = await db.insert(bius).values({}).returning()
    if (!round) throw new Error("seed failed")
    const first = await seedSet(biuSets, {
      roundId: round.id,
      userId: ada.id,
      position: 1,
      name: "unispin",
    })
    const second = await seedSet(biuSets, {
      roundId: round.id,
      userId: bo.id,
      position: 2,
      name: "unispin, crankflip",
      parentSetId: first.id,
    })
    const gone = await seedSet(biuSets, {
      roundId: round.id,
      userId: ada.id,
      position: 3,
      name: "deleted set",
      parentSetId: second.id,
      deletedAt: new Date(),
    })
    await db.insert(biuSetMessages).values([
      { biuSetId: second.id, userId: bo.id, content: "land it clean" },
      { biuSetId: second.id, userId: ada.id, content: "nice" },
    ])

    const rounds = await runChecked(listRoundsTool, { game: "biu" })
    expect(rounds.rounds).toEqual([
      expect.objectContaining({
        roundId: round.id,
        status: null,
        endedAt: null,
        sets: 2,
        latestSet: "unispin, crankflip",
      }),
    ])

    const chain = await runChecked(getChainRoundTool, {
      game: "biu",
      roundId: round.id,
    })
    expect(chain.sets.map((s) => s.setId)).toEqual([first.id, second.id])
    expect(chain.sets[1]).toMatchObject({ parentSetId: first.id, comments: 2 })

    const set = await runChecked(getChainSetTool, {
      game: "biu",
      setId: second.id,
    })
    expect(set.parent?.setId).toBe(first.id)
    // The only child is deleted, so the set has no child.
    expect(set.child).toBeNull()
    expect(set.instructions).toBe("land it clean")
    expect(set.comments.map((c) => c.isInstructions)).toEqual([true, false])

    const firstSet = await runChecked(getChainSetTool, {
      game: "biu",
      setId: first.id,
    })
    expect(firstSet.child?.setId).toBe(second.id)
    expect(firstSet.instructions).toBeNull()

    expect(
      getChainSetTool.run(db, { game: "biu", setId: gone.id }),
    ).rejects.toBeInstanceOf(ToolError)
    expect(
      getChainRoundTool.run(db, { game: "biu", roundId: 999_999 }),
    ).rejects.toBeInstanceOf(ToolError)
  })

  it("lists SIU rounds with their status and end time", async () => {
    const { ada } = await seedRiders()
    const endedAt = new Date("2026-10-01T00:00:00Z")
    const [old] = await db
      .insert(sius)
      .values({
        status: "archived",
        endedAt,
        createdAt: new Date("2026-09-01T00:00:00Z"),
      })
      .returning()
    const [live] = await db.insert(sius).values({}).returning()
    if (!old || !live) throw new Error("seed failed")
    await seedSet(siuSets, {
      roundId: live.id,
      userId: ada.id,
      position: 1,
      name: "hop",
    })

    const out = await runChecked(listRoundsTool, { game: "siu" })
    expect(out.rounds.map((r) => [r.roundId, r.status, r.sets])).toEqual([
      [live.id, "active", 1],
      [old.id, "archived", 0],
    ])
    expect(out.rounds[1]?.endedAt).toBe(endedAt.toISOString())
  })

  it("lists RIU rounds and leaves out the private upcoming round", async () => {
    const { ada } = await seedRiders()
    const [old] = await db
      .insert(rius)
      .values({ status: "archived" })
      .returning()
    const [active] = await db
      .insert(rius)
      .values({ status: "active" })
      .returning()
    const [upcoming] = await db
      .insert(rius)
      .values({ status: "upcoming" })
      .returning()
    if (!old || !active || !upcoming) throw new Error("seed failed")
    await seedRiuSet(active.id, ada.id, "first set")
    await seedRiuSet(active.id, ada.id, "newest set")
    await seedRiuSet(upcoming.id, ada.id, "secret set")

    const out = await runChecked(listRoundsTool, { game: "riu" })
    expect(out.rounds).toEqual([
      expect.objectContaining({
        roundId: active.id,
        status: "active",
        sets: 2,
        latestSet: "newest set",
      }),
      expect.objectContaining({ roundId: old.id, status: "archived", sets: 0 }),
    ])
    expect(JSON.stringify(out)).not.toContain("secret set")
  })
})

describe("rider, trick and site tools", () => {
  it("list_submissions pages a rider's submissions newest first", async () => {
    const { ada, bo } = await seedRiders()
    const [active] = await db
      .insert(rius)
      .values({ status: "active" })
      .returning()
    if (!active) throw new Error("seed failed")
    for (const name of ["one", "two", "three"]) {
      const set = await seedRiuSet(active.id, ada.id, name)
      const video = await seedMuxVideo()
      await db.insert(riuSubmissions).values({
        riuSetId: set.id,
        userId: bo.id,
        muxAssetId: video.assetId,
      })
    }

    const page1 = await runChecked(listSubmissionsTool, {
      userId: bo.id,
      limit: 2,
    })
    expect(page1.submissions.map((s) => s.setName)).toEqual(["three", "two"])
    const page2 = await runChecked(listSubmissionsTool, {
      userId: bo.id,
      limit: 2,
      before: page1.nextBefore ?? undefined,
    })
    expect(page2.submissions.map((s) => s.setName)).toEqual(["one"])
    expect(page2.nextBefore).toBeNull()

    expect(
      listSubmissionsTool.run(db, { userId: 999_999, limit: 10 }),
    ).rejects.toBeInstanceOf(ToolError)
  })

  it("get_trick shows links both ways and only active videos", async () => {
    const { ada } = await seedRiders()
    const [base, next] = await db
      .insert(tricks)
      .values([{ name: "unispin" }, { name: "double unispin" }])
      .returning()
    if (!base || !next) throw new Error("seed failed")
    await db.insert(trickRelationships).values({
      sourceTrickId: next.id,
      targetTrickId: base.id,
      type: "prerequisite",
    })
    const shown = await seedMuxVideo()
    const hidden = await seedMuxVideo()
    await db.insert(trickVideos).values([
      {
        trickId: base.id,
        muxAssetId: shown.assetId,
        status: "active",
        submittedByUserId: ada.id,
      },
      {
        trickId: base.id,
        muxAssetId: hidden.assetId,
        status: "pending",
        submittedByUserId: ada.id,
      },
    ])

    const trick = await runChecked(getTrickTool, { trickId: base.id })
    expect(trick.relationships).toEqual([
      {
        type: "prerequisite",
        direction: "incoming",
        trick: { id: next.id, name: "double unispin" },
      },
    ])
    expect(trick.videos.map((v) => v.videoUrl)).toEqual([
      `https://stream.mux.com/${shown.playbackId}.m3u8`,
    ])

    const other = await runChecked(getTrickTool, { trickId: next.id })
    expect(other.relationships[0]?.direction).toBe("outgoing")

    expect(getTrickTool.run(db, { trickId: 999_999 })).rejects.toBeInstanceOf(
      ToolError,
    )
  })

  it("recent_activity and get_stats leave out upcoming RIU sets and deleted chain sets", async () => {
    const { ada, bo } = await seedRiders()
    const [upcoming] = await db
      .insert(rius)
      .values({ status: "upcoming" })
      .returning()
    const [active] = await db
      .insert(rius)
      .values({ status: "active" })
      .returning()
    const [biu] = await db.insert(bius).values({}).returning()
    if (!upcoming || !active || !biu) throw new Error("seed failed")
    await seedRiuSet(upcoming.id, ada.id, "secret set")
    await seedRiuSet(active.id, ada.id, "open set")
    await seedSet(biuSets, {
      roundId: biu.id,
      userId: bo.id,
      position: 1,
      name: "live set",
    })
    await seedSet(biuSets, {
      roundId: biu.id,
      userId: bo.id,
      position: 2,
      name: "deleted set",
      deletedAt: new Date(),
    })
    await db
      .insert(posts)
      .values({ title: "hello", content: "hi", userId: bo.id })

    const activity = await runChecked(recentActivityTool, {
      since: "2000-01-01T00:00:00Z",
    })
    const titles = activity.items.map((i) => i.title)
    expect(titles).toContain("open set")
    expect(titles).toContain("live set")
    expect(titles).toContain("hello")
    expect(titles).not.toContain("secret set")
    expect(titles).not.toContain("deleted set")

    const future = await runChecked(recentActivityTool, {
      since: "2999-01-01T00:00:00Z",
    })
    expect(future.items).toEqual([])

    const stats = await runChecked(getStatsTool, {})
    expect(stats.totals).toMatchObject({
      users: 2,
      posts: 1,
      riuSets: 1,
      biuSets: 1,
    })
    // Bo: one post and one live BIU set. Ada: one public RIU set.
    expect(stats.topContributors).toEqual([
      { id: bo.id, name: "Bo Rider", contentCount: 2 },
      { id: ada.id, name: "Ada Rider", contentCount: 1 },
    ])
  })
})

describe("vault tools", () => {
  it("get_video reads riders, likes and comments, and falls back to the old title", async () => {
    const { ada, bo } = await seedRiders()
    const mux = await seedMuxVideo()
    const [video] = await db
      .insert(utvVideos)
      .values({
        legacyUrl: "https://example.com/v",
        legacyTitle: "old site title",
        muxAssetId: mux.assetId,
      })
      .returning()
    if (!video) throw new Error("seed failed")
    await db.insert(utvVideoRiders).values([
      { utvVideoId: video.id, userId: bo.id, order: 1 },
      { utvVideoId: video.id, userId: ada.id, order: 0 },
      { utvVideoId: video.id, name: "Guest Rider", order: 2 },
    ])
    await db
      .insert(utvVideoLikes)
      .values({ utvVideoId: video.id, userId: bo.id })
    await db.insert(utvVideoMessages).values([
      { utvVideoId: video.id, userId: ada.id, content: "first" },
      { utvVideoId: video.id, userId: bo.id, content: "second" },
    ])

    const out = await runChecked(getVideoTool, { videoId: video.id })
    expect(out).toMatchObject({
      title: "old site title",
      likes: 1,
      videoUrl: `https://stream.mux.com/${mux.playbackId}.m3u8`,
    })
    expect(out.riders).toEqual([
      { id: ada.id, name: "Ada Rider" },
      { id: bo.id, name: "Bo Rider" },
      { id: null, name: "Guest Rider" },
    ])
    expect(out.comments.map((c) => c.content)).toEqual(["first", "second"])

    const hits = await runChecked(searchVideosTool, { q: "old site" })
    expect(hits.videos.map((v) => [v.id, v.title])).toEqual([
      [video.id, "old site title"],
    ])

    await expect(
      getVideoTool.run(db, { videoId: 999_999 }),
    ).rejects.toBeInstanceOf(ToolError)
  })
})
