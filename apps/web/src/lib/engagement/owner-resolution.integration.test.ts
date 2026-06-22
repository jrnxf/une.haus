import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import {
  biuSetMessages,
  biuSets,
  bius,
  chatMessages,
  postMessages,
  posts,
  riuSetMessages,
  riuSets,
  riuSubmissionMessages,
  riuSubmissions,
  rius,
  siuSetMessages,
  siuSets,
  sius,
  trickMessages,
  tricks,
  utvVideoMessages,
  utvVideos,
} from "~/db/schema"
import {
  resolveContentOwner,
  resolveMessageTarget,
} from "~/lib/engagement/registry.server"
import { likeRecord } from "~/lib/reactions/ops.server"
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

// Owner-resolution now lives in the EntityRegistry. These tests pin the
// recipient identity per entity type — content owner vs message author — and
// the subtle game cases where a submission notifies its submitter while a set
// notifies the set owner.
describe("engagement owner-resolution via registry", () => {
  describe("resolveContentOwner — content notifies the content owner", () => {
    it("post → the post author", async () => {
      const owner = await seedUser({ name: "Post Owner" })
      const [post] = await db
        .insert(posts)
        .values({ content: "c", title: "t", userId: owner.id })
        .returning()

      expect(await resolveContentOwner("post", post.id)).toBe(owner.id)
    })

    it("riuSet → the set owner", async () => {
      const owner = await seedUser({ name: "Set Owner" })
      const [riu] = await db.insert(rius).values({}).returning()
      const video = await seedMuxVideo()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: owner.id,
          muxAssetId: video.assetId,
        })
        .returning()

      expect(await resolveContentOwner("riuSet", set.id)).toBe(owner.id)
    })

    it("riuSubmission → its submitter, not the set owner", async () => {
      const setOwner = await seedUser({ name: "Set Owner" })
      const submitter = await seedUser({ name: "Submitter" })
      const [riu] = await db.insert(rius).values({}).returning()
      const setVideo = await seedMuxVideo()
      const subVideo = await seedMuxVideo()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: setOwner.id,
          muxAssetId: setVideo.assetId,
        })
        .returning()
      const [submission] = await db
        .insert(riuSubmissions)
        .values({
          riuSetId: set.id,
          userId: submitter.id,
          muxAssetId: subVideo.assetId,
        })
        .returning()

      // The subtle case: a submission resolves to the submitter, not the owner
      // of the set it was submitted against.
      expect(await resolveContentOwner("riuSubmission", submission.id)).toBe(
        submitter.id,
      )
      expect(await resolveContentOwner("riuSet", set.id)).toBe(setOwner.id)
      expect(setOwner.id).not.toBe(submitter.id)
    })

    it("biuSet → the set owner", async () => {
      const owner = await seedUser({ name: "Biu Owner" })
      const [biu] = await db.insert(bius).values({}).returning()
      const video = await seedMuxVideo()
      const [set] = await db
        .insert(biuSets)
        .values({
          name: "set",
          position: 0,
          biuId: biu.id,
          userId: owner.id,
          muxAssetId: video.assetId,
        })
        .returning()

      expect(await resolveContentOwner("biuSet", set.id)).toBe(owner.id)
    })

    it("siuSet → the set owner", async () => {
      const owner = await seedUser({ name: "Siu Owner" })
      const [siu] = await db.insert(sius).values({}).returning()
      const video = await seedMuxVideo()
      const [set] = await db
        .insert(siuSets)
        .values({
          name: "set",
          position: 0,
          siuId: siu.id,
          userId: owner.id,
          muxAssetId: video.assetId,
        })
        .returning()

      expect(await resolveContentOwner("siuSet", set.id)).toBe(owner.id)
    })

    it("utvVideo → null (legacy imports have no owner)", async () => {
      const [video] = await db
        .insert(utvVideos)
        .values({ legacyUrl: "u", legacyTitle: "t" })
        .returning()

      expect(await resolveContentOwner("utvVideo", video.id)).toBeNull()
    })

    it("trick → the rider credited with inventing it", async () => {
      const inventor = await seedUser({ name: "Inventor" })
      const [trick] = await db
        .insert(tricks)
        .values({ name: "barspin", inventedByUserId: inventor.id })
        .returning()

      expect(await resolveContentOwner("trick", trick.id)).toBe(inventor.id)
    })

    it("returns null for a missing record", async () => {
      expect(await resolveContentOwner("post", 999_999)).toBeNull()
    })
  })

  describe("resolveMessageTarget — message likes notify the message author", () => {
    it("postMessage → author, referencing the parent post", async () => {
      const author = await seedUser({ name: "Author" })
      const [post] = await db
        .insert(posts)
        .values({ content: "c", title: "t", userId: author.id })
        .returning()
      const [message] = await db
        .insert(postMessages)
        .values({ content: "m", postId: post.id, userId: author.id })
        .returning()

      expect(await resolveMessageTarget("postMessage", message.id)).toEqual({
        ownerId: author.id,
        parentEntityType: "post",
        parentEntityId: post.id,
      })
    })

    it("chatMessage → author, referencing the chat (parent id 0)", async () => {
      const author = await seedUser({ name: "Author" })
      const [message] = await db
        .insert(chatMessages)
        .values({ content: "m", userId: author.id })
        .returning()

      expect(await resolveMessageTarget("chatMessage", message.id)).toEqual({
        ownerId: author.id,
        parentEntityType: "chat",
        parentEntityId: 0,
      })
    })

    it("riuSetMessage → author, referencing the parent set", async () => {
      const author = await seedUser({ name: "Author" })
      const [riu] = await db.insert(rius).values({}).returning()
      const video = await seedMuxVideo()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: author.id,
          muxAssetId: video.assetId,
        })
        .returning()
      const [message] = await db
        .insert(riuSetMessages)
        .values({ content: "m", riuSetId: set.id, userId: author.id })
        .returning()

      expect(await resolveMessageTarget("riuSetMessage", message.id)).toEqual({
        ownerId: author.id,
        parentEntityType: "riuSet",
        parentEntityId: set.id,
      })
    })

    it("riuSubmissionMessage → author, referencing the parent submission", async () => {
      const author = await seedUser({ name: "Author" })
      const [riu] = await db.insert(rius).values({}).returning()
      const setVideo = await seedMuxVideo()
      const subVideo = await seedMuxVideo()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: author.id,
          muxAssetId: setVideo.assetId,
        })
        .returning()
      const [submission] = await db
        .insert(riuSubmissions)
        .values({
          riuSetId: set.id,
          userId: author.id,
          muxAssetId: subVideo.assetId,
        })
        .returning()
      const [message] = await db
        .insert(riuSubmissionMessages)
        .values({
          content: "m",
          riuSubmissionId: submission.id,
          userId: author.id,
        })
        .returning()

      expect(
        await resolveMessageTarget("riuSubmissionMessage", message.id),
      ).toEqual({
        ownerId: author.id,
        parentEntityType: "riuSubmission",
        parentEntityId: submission.id,
      })
    })

    it("utvVideoMessage → author, referencing the parent video", async () => {
      const author = await seedUser({ name: "Author" })
      const [video] = await db
        .insert(utvVideos)
        .values({ legacyUrl: "u", legacyTitle: "t" })
        .returning()
      const [message] = await db
        .insert(utvVideoMessages)
        .values({ content: "m", utvVideoId: video.id, userId: author.id })
        .returning()

      expect(await resolveMessageTarget("utvVideoMessage", message.id)).toEqual(
        {
          ownerId: author.id,
          parentEntityType: "utvVideo",
          parentEntityId: video.id,
        },
      )
    })

    it("biuSetMessage → author, referencing the parent set", async () => {
      const author = await seedUser({ name: "Author" })
      const [biu] = await db.insert(bius).values({}).returning()
      const video = await seedMuxVideo()
      const [set] = await db
        .insert(biuSets)
        .values({
          name: "set",
          position: 0,
          biuId: biu.id,
          userId: author.id,
          muxAssetId: video.assetId,
        })
        .returning()
      const [message] = await db
        .insert(biuSetMessages)
        .values({ content: "m", biuSetId: set.id, userId: author.id })
        .returning()

      expect(await resolveMessageTarget("biuSetMessage", message.id)).toEqual({
        ownerId: author.id,
        parentEntityType: "biuSet",
        parentEntityId: set.id,
      })
    })

    it("siuSetMessage → author, referencing the parent set", async () => {
      const author = await seedUser({ name: "Author" })
      const [siu] = await db.insert(sius).values({}).returning()
      const video = await seedMuxVideo()
      const [set] = await db
        .insert(siuSets)
        .values({
          name: "set",
          position: 0,
          siuId: siu.id,
          userId: author.id,
          muxAssetId: video.assetId,
        })
        .returning()
      const [message] = await db
        .insert(siuSetMessages)
        .values({ content: "m", siuSetId: set.id, userId: author.id })
        .returning()

      expect(await resolveMessageTarget("siuSetMessage", message.id)).toEqual({
        ownerId: author.id,
        parentEntityType: "siuSet",
        parentEntityId: set.id,
      })
    })

    it("trickMessage → null (tricks are not a notifiable parent yet)", async () => {
      const author = await seedUser({ name: "Author" })
      const [trick] = await db
        .insert(tricks)
        .values({ name: "tailwhip" })
        .returning()
      const [message] = await db
        .insert(trickMessages)
        .values({ content: "m", trickId: trick.id, userId: author.id })
        .returning()

      expect(await resolveMessageTarget("trickMessage", message.id)).toBeNull()
    })

    it("returns null for a missing message", async () => {
      expect(await resolveMessageTarget("postMessage", 999_999)).toBeNull()
    })
  })

  describe("end-to-end recipient via likeRecord", () => {
    it("liking a set notifies the set owner; liking a submission notifies its submitter", async () => {
      const setOwner = await seedUser({ name: "Set Owner" })
      const submitter = await seedUser({ name: "Submitter" })
      const liker = await seedUser({ name: "Liker" })

      const [riu] = await db.insert(rius).values({}).returning()
      const setVideo = await seedMuxVideo()
      const subVideo = await seedMuxVideo()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: setOwner.id,
          muxAssetId: setVideo.assetId,
        })
        .returning()
      const [submission] = await db
        .insert(riuSubmissions)
        .values({
          riuSetId: set.id,
          userId: submitter.id,
          muxAssetId: subVideo.assetId,
        })
        .returning()

      await likeRecord({
        ...asUser(liker),
        data: { type: "riuSet", recordId: set.id },
      })
      await likeRecord({
        ...asUser(liker),
        data: { type: "riuSubmission", recordId: submission.id },
      })

      await waitFor(async () => {
        const rows = await db.query.notifications.findMany()
        expect(rows).toHaveLength(2)
      })

      const rows = await db.query.notifications.findMany()
      const byEntity = new Map(rows.map((r) => [r.entityType, r]))
      expect(byEntity.get("riuSet")).toEqual(
        expect.objectContaining({
          userId: setOwner.id,
          actorId: liker.id,
          type: "like",
          entityId: set.id,
        }),
      )
      expect(byEntity.get("riuSubmission")).toEqual(
        expect.objectContaining({
          userId: submitter.id,
          actorId: liker.id,
          type: "like",
          entityId: submission.id,
        }),
      )
    })

    it("liking your own content does not notify you", async () => {
      const owner = await seedUser({ name: "Owner" })
      const [post] = await db
        .insert(posts)
        .values({ content: "c", title: "t", userId: owner.id })
        .returning()

      await likeRecord({
        ...asUser(owner),
        data: { type: "post", recordId: post.id },
      })

      await new Promise((r) => setTimeout(r, 100))
      expect(await db.query.notifications.findMany()).toHaveLength(0)
    })

    it("liking an ownerless legacy vault video notifies nobody", async () => {
      const liker = await seedUser({ name: "Liker" })
      const [video] = await db
        .insert(utvVideos)
        .values({ legacyUrl: "u", legacyTitle: "t" })
        .returning()

      await likeRecord({
        ...asUser(liker),
        data: { type: "utvVideo", recordId: video.id },
      })

      await new Promise((r) => setTimeout(r, 100))
      expect(await db.query.notifications.findMany()).toHaveLength(0)
    })
  })
})
