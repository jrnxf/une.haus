import { beforeEach, describe, expect, it } from "bun:test"
import { and, eq, getTableName } from "drizzle-orm"
import { type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core"

import { db } from "~/db"
import {
  type NotificationEntityType,
  biuSetMessages,
  biuSets,
  bius,
  chatMessages,
  muxVideos,
  postMessages,
  posts,
  riuSetMessages,
  riuSets,
  rius,
  riuSubmissionMessages,
  riuSubmissions,
  siuSetMessages,
  siuSets,
  sius,
  utvVideoMessages,
  utvVideos,
} from "~/db/schema"
import { ENTITY_REGISTRY } from "~/lib/engagement/registry.server"
import { likeRecord, unlikeRecord } from "~/lib/reactions/ops.server"
import { recordTypeWithLikes } from "~/lib/reactions/schemas"
import {
  asUser,
  randomId,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "~/testing/integration"

type ReactableType = (typeof recordTypeWithLikes)[number]
type SeededUser = Awaited<ReturnType<typeof seedUser>>

/**
 * Outcome a like by a *different* user should produce.
 * `null` recipient means no notification is expected (e.g. ownerless content).
 */
type ExpectedNotification = {
  recipientId: number
  entityType: NotificationEntityType
  entityId: number
} | null

type SeedResult = {
  /** The id passed to like/unlike as `recordId`. */
  recordId: number
  /** Who should be notified when a different user likes this record. */
  expected: ExpectedNotification
}

/**
 * A reactable type plus how to seed one record of it owned/authored by `owner`.
 */
type Case = {
  type: ReactableType
  seed: (owner: SeededUser) => Promise<SeedResult>
}

/** Seed a mux asset and return its id (text PK with no default). */
async function seedMuxAssetId() {
  const assetId = randomId("asset")
  await db.insert(muxVideos).values({
    assetId,
    playbackId: `playback-${assetId}`,
  })
  return assetId
}

/** Every `*_likes` table has a `userId` column; reach it by name for queries. */
function likeUserId(table: PgTable): AnyPgColumn {
  return (table as unknown as Record<string, AnyPgColumn>).userId
}

/** Count rows in a type's `*_likes` table for a given record. */
async function countLikes(type: ReactableType, recordId: number) {
  const { likesTable, fkColumn } = ENTITY_REGISTRY[type]
  const rows = await db.select().from(likesTable).where(eq(fkColumn, recordId))
  return rows.length
}

const cases: Case[] = [
  // --- content: a like notifies the content owner ---
  {
    type: "post",
    seed: async (owner) => {
      const [post] = await db
        .insert(posts)
        .values({ content: "body", title: "post", userId: owner.id })
        .returning()
      return {
        recordId: post.id,
        expected: {
          recipientId: owner.id,
          entityType: "post",
          entityId: post.id,
        },
      }
    },
  },
  {
    type: "riuSet",
    seed: async (owner) => {
      const [riu] = await db.insert(rius).values({}).returning()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      return {
        recordId: set.id,
        expected: {
          recipientId: owner.id,
          entityType: "riuSet",
          entityId: set.id,
        },
      }
    },
  },
  {
    type: "riuSubmission",
    seed: async (owner) => {
      const [riu] = await db.insert(rius).values({}).returning()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      const [submission] = await db
        .insert(riuSubmissions)
        .values({
          riuSetId: set.id,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      return {
        recordId: submission.id,
        expected: {
          recipientId: owner.id,
          entityType: "riuSubmission",
          entityId: submission.id,
        },
      }
    },
  },
  {
    type: "biuSet",
    seed: async (owner) => {
      const [biu] = await db.insert(bius).values({}).returning()
      const [set] = await db
        .insert(biuSets)
        .values({
          biuId: biu.id,
          name: "set",
          position: 0,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      return {
        recordId: set.id,
        expected: {
          recipientId: owner.id,
          entityType: "biuSet",
          entityId: set.id,
        },
      }
    },
  },
  {
    type: "siuSet",
    seed: async (owner) => {
      const [siu] = await db.insert(sius).values({}).returning()
      const [set] = await db
        .insert(siuSets)
        .values({
          siuId: siu.id,
          name: "set",
          position: 0,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      return {
        recordId: set.id,
        expected: {
          recipientId: owner.id,
          entityType: "siuSet",
          entityId: set.id,
        },
      }
    },
  },
  {
    type: "utvVideo",
    // Vault videos are legacy imports with no owner — a like notifies nobody.
    seed: async () => {
      const [video] = await db
        .insert(utvVideos)
        .values({ legacyUrl: "https://example.com", legacyTitle: "video" })
        .returning()
      return { recordId: video.id, expected: null }
    },
  },

  // --- message: a like notifies the author, referencing the parent entity ---
  {
    type: "chatMessage",
    seed: async (owner) => {
      const [message] = await db
        .insert(chatMessages)
        .values({ content: "msg", userId: owner.id })
        .returning()
      return {
        recordId: message.id,
        // chat has no parent entity row — parentEntityId is 0 by convention.
        expected: { recipientId: owner.id, entityType: "chat", entityId: 0 },
      }
    },
  },
  {
    type: "postMessage",
    seed: async (owner) => {
      const [post] = await db
        .insert(posts)
        .values({ content: "body", title: "post", userId: owner.id })
        .returning()
      const [message] = await db
        .insert(postMessages)
        .values({ content: "msg", postId: post.id, userId: owner.id })
        .returning()
      return {
        recordId: message.id,
        expected: {
          recipientId: owner.id,
          entityType: "post",
          entityId: post.id,
        },
      }
    },
  },
  {
    type: "riuSetMessage",
    seed: async (owner) => {
      const [riu] = await db.insert(rius).values({}).returning()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      const [message] = await db
        .insert(riuSetMessages)
        .values({ content: "msg", riuSetId: set.id, userId: owner.id })
        .returning()
      return {
        recordId: message.id,
        expected: {
          recipientId: owner.id,
          entityType: "riuSet",
          entityId: set.id,
        },
      }
    },
  },
  {
    type: "riuSubmissionMessage",
    seed: async (owner) => {
      const [riu] = await db.insert(rius).values({}).returning()
      const [set] = await db
        .insert(riuSets)
        .values({
          name: "set",
          riuId: riu.id,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      const [submission] = await db
        .insert(riuSubmissions)
        .values({
          riuSetId: set.id,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      const [message] = await db
        .insert(riuSubmissionMessages)
        .values({
          content: "msg",
          riuSubmissionId: submission.id,
          userId: owner.id,
        })
        .returning()
      return {
        recordId: message.id,
        expected: {
          recipientId: owner.id,
          entityType: "riuSubmission",
          entityId: submission.id,
        },
      }
    },
  },
  {
    type: "utvVideoMessage",
    seed: async (owner) => {
      const [video] = await db
        .insert(utvVideos)
        .values({ legacyUrl: "https://example.com", legacyTitle: "video" })
        .returning()
      const [message] = await db
        .insert(utvVideoMessages)
        .values({ content: "msg", utvVideoId: video.id, userId: owner.id })
        .returning()
      return {
        recordId: message.id,
        expected: {
          recipientId: owner.id,
          entityType: "utvVideo",
          entityId: video.id,
        },
      }
    },
  },
  {
    type: "biuSetMessage",
    seed: async (owner) => {
      const [biu] = await db.insert(bius).values({}).returning()
      const [set] = await db
        .insert(biuSets)
        .values({
          biuId: biu.id,
          name: "set",
          position: 0,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      const [message] = await db
        .insert(biuSetMessages)
        .values({ content: "msg", biuSetId: set.id, userId: owner.id })
        .returning()
      return {
        recordId: message.id,
        expected: {
          recipientId: owner.id,
          entityType: "biuSet",
          entityId: set.id,
        },
      }
    },
  },
  {
    type: "siuSetMessage",
    seed: async (owner) => {
      const [siu] = await db.insert(sius).values({}).returning()
      const [set] = await db
        .insert(siuSets)
        .values({
          siuId: siu.id,
          name: "set",
          position: 0,
          userId: owner.id,
          muxAssetId: await seedMuxAssetId(),
        })
        .returning()
      const [message] = await db
        .insert(siuSetMessages)
        .values({ content: "msg", siuSetId: set.id, userId: owner.id })
        .returning()
      return {
        recordId: message.id,
        expected: {
          recipientId: owner.id,
          entityType: "siuSet",
          entityId: set.id,
        },
      }
    },
  },
]

beforeEach(async () => {
  await truncatePublicTables()
})

describe("reactions integration — all reactable types via the registry", () => {
  // Guards that the suite stays exhaustive: the cases must cover exactly the
  // reactable type union derived from the registry.
  it("covers every reactable type exactly once", () => {
    expect(cases.map((c) => c.type).toSorted()).toEqual(
      [...recordTypeWithLikes].toSorted(),
    )
  })

  for (const { type, seed } of cases) {
    const binding = ENTITY_REGISTRY[type]

    describe(type, () => {
      it(`likeRecord inserts into ${getTableName(binding.likesTable)} and notifies the correct recipient`, async () => {
        const owner = await seedUser({ name: "Owner" })
        const liker = await seedUser({ name: "Liker" })
        const { recordId, expected } = await seed(owner)

        await likeRecord({ ...asUser(liker), data: { recordId, type } })

        // The like row exists, keyed by the registry's foreign-key column.
        const { likesTable, fkColumn } = binding
        const likeRows = await db
          .select()
          .from(likesTable)
          .where(
            and(eq(fkColumn, recordId), eq(likeUserId(likesTable), liker.id)),
          )
        expect(likeRows).toHaveLength(1)

        if (expected) {
          await waitFor(async () => {
            expect(await db.query.notifications.findMany()).toHaveLength(1)
          })
          const [notification] = await db.query.notifications.findMany()
          expect(notification).toEqual(
            expect.objectContaining({
              actorId: liker.id,
              userId: expected.recipientId,
              entityType: expected.entityType,
              entityId: expected.entityId,
              type: binding.notificationType,
            }),
          )
          if (binding.kind === "message") {
            expect(notification.data).toEqual(
              expect.objectContaining({ messageId: recordId }),
            )
          }
        } else {
          // Ownerless content (utvVideo) inserts the like but notifies nobody.
          await Bun.sleep(100)
          expect(await db.query.notifications.findMany()).toHaveLength(0)
        }
      })

      it("self-like inserts the row but creates no notification", async () => {
        const owner = await seedUser({ name: "Owner" })
        const { recordId } = await seed(owner)

        await likeRecord({ ...asUser(owner), data: { recordId, type } })

        expect(await countLikes(type, recordId)).toBe(1)
        await Bun.sleep(100)
        expect(await db.query.notifications.findMany()).toHaveLength(0)
      })

      it("unlikeRecord removes the acting user's like row", async () => {
        const owner = await seedUser({ name: "Owner" })
        const liker = await seedUser({ name: "Liker" })
        const { recordId } = await seed(owner)

        await likeRecord({ ...asUser(liker), data: { recordId, type } })
        expect(await countLikes(type, recordId)).toBe(1)

        await unlikeRecord({ ...asUser(liker), data: { recordId, type } })
        expect(await countLikes(type, recordId)).toBe(0)
      })

      it("double-like is idempotent (one row, no duplicate notification)", async () => {
        const owner = await seedUser({ name: "Owner" })
        const liker = await seedUser({ name: "Liker" })
        const { recordId, expected } = await seed(owner)

        await likeRecord({ ...asUser(liker), data: { recordId, type } })
        await likeRecord({ ...asUser(liker), data: { recordId, type } })

        expect(await countLikes(type, recordId)).toBe(1)
        await Bun.sleep(100)
        expect(await db.query.notifications.findMany()).toHaveLength(
          expected ? 1 : 0,
        )
      })
    })
  }
})
