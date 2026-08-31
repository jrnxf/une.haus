import { beforeEach, describe, expect, it } from "bun:test"
import { eq, getTableName } from "drizzle-orm"

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
  rius,
  riuSubmissionMessages,
  riuSubmissions,
  siuSetMessages,
  siuSets,
  sius,
  utvVideoMessages,
  utvVideos,
} from "~/db/schema"
import {
  MESSAGE_PARENT_REGISTRY,
  RECORD_MESSAGE_PARENT_TYPES,
} from "~/lib/engagement/registry.server"
import { invariant } from "~/lib/invariant"
import {
  createMessage,
  deleteMessage,
  listMessages,
} from "~/lib/messages/ops.server"
import { recordWithMessagesTypes } from "~/lib/messages/schemas"
import {
  asUser,
  seedMuxVideo,
  seedUser,
  truncatePublicTables,
  waitFor,
} from "~/testing/integration"

/** Narrow the first row of an insert/select, failing loudly if absent. */
function first<T>(rows: T[]): T {
  const [row] = rows
  invariant(row, "expected at least one row")
  return row
}

/**
 * The parent-fk *property* key for a record message type. Drizzle `.values()`
 * is keyed by property name, so we map the registry's parent column reference
 * back to the property key on its table by identity.
 */
function parentColumnKey(type: keyof typeof MESSAGE_PARENT_REGISTRY): string {
  const { messageTable, parentColumn } = MESSAGE_PARENT_REGISTRY[type]
  invariant(parentColumn, `${type} must have a parent column`)
  const entry = Object.entries(
    messageTable as unknown as Record<string, unknown>,
  ).find(([, value]) => value === parentColumn)
  invariant(entry, `parent column not found on ${type} message table`)
  return entry[0]
}

beforeEach(async () => {
  await truncatePublicTables()
})

/**
 * Table-driven coverage across every non-chat content type. Each case knows how
 * to seed a parent record owned by a given user, and which message table the
 * registry must route the message into. Adding a content type without adding a
 * case here makes the `RECORD_MESSAGE_PARENT_TYPES` coverage test below fail.
 */
const recordCases = [
  {
    type: "post" as const,
    messageTable: postMessages,
    async seedParent(ownerId: number) {
      const post = first(
        await db
          .insert(posts)
          .values({ content: "body", title: "title", userId: ownerId })
          .returning(),
      )
      return post.id
    },
  },
  {
    type: "riuSet" as const,
    messageTable: riuSetMessages,
    async seedParent(ownerId: number) {
      // Seed as archived so a test can create several independent parents: at
      // most one active and one upcoming round may exist at a time.
      const riu = first(
        await db.insert(rius).values({ status: "archived" }).returning(),
      )
      const mux = await seedMuxVideo()
      const set = first(
        await db
          .insert(riuSets)
          .values({
            name: "set",
            riuId: riu.id,
            userId: ownerId,
            muxAssetId: mux.assetId,
          })
          .returning(),
      )
      return set.id
    },
  },
  {
    type: "riuSubmission" as const,
    messageTable: riuSubmissionMessages,
    async seedParent(ownerId: number) {
      // Seed as archived so a test can create several independent parents: at
      // most one active and one upcoming round may exist at a time.
      const riu = first(
        await db.insert(rius).values({ status: "archived" }).returning(),
      )
      const setMux = await seedMuxVideo()
      const set = first(
        await db
          .insert(riuSets)
          .values({
            name: "set",
            riuId: riu.id,
            userId: ownerId,
            muxAssetId: setMux.assetId,
          })
          .returning(),
      )
      const subMux = await seedMuxVideo()
      const submission = first(
        await db
          .insert(riuSubmissions)
          .values({
            riuSetId: set.id,
            userId: ownerId,
            muxAssetId: subMux.assetId,
          })
          .returning(),
      )
      return submission.id
    },
  },
  {
    type: "biuSet" as const,
    messageTable: biuSetMessages,
    async seedParent(ownerId: number) {
      const biu = first(await db.insert(bius).values({}).returning())
      const mux = await seedMuxVideo()
      const set = first(
        await db
          .insert(biuSets)
          .values({
            biuId: biu.id,
            userId: ownerId,
            muxAssetId: mux.assetId,
            name: "set",
            position: 0,
          })
          .returning(),
      )
      return set.id
    },
  },
  {
    type: "siuSet" as const,
    messageTable: siuSetMessages,
    async seedParent(ownerId: number) {
      const siu = first(await db.insert(sius).values({}).returning())
      const mux = await seedMuxVideo()
      const set = first(
        await db
          .insert(siuSets)
          .values({
            siuId: siu.id,
            userId: ownerId,
            muxAssetId: mux.assetId,
            name: "set",
            position: 0,
          })
          .returning(),
      )
      return set.id
    },
  },
  {
    type: "utvVideo" as const,
    messageTable: utvVideoMessages,
    async seedParent(_ownerId: number) {
      const video = first(
        await db
          .insert(utvVideos)
          .values({ legacyUrl: "https://unicycle.tv/x", legacyTitle: "legacy" })
          .returning(),
      )
      return video.id
    },
  },
]

describe("messages dispatch across content types", () => {
  it("registry record types match the schema's recordWithMessagesTypes", () => {
    expect([...RECORD_MESSAGE_PARENT_TYPES].toSorted()).toEqual(
      [...recordWithMessagesTypes].toSorted(),
    )
    // The cases table must cover every record type the registry knows about.
    expect(recordCases.map((c) => c.type).toSorted()).toEqual(
      [...RECORD_MESSAGE_PARENT_TYPES].toSorted(),
    )
  })

  for (const testCase of recordCases) {
    describe(testCase.type, () => {
      it("routes the message into the registry-owned table", async () => {
        const author = await seedUser({ name: "Author" })
        const parentId = await testCase.seedParent(author.id)

        await createMessage({
          ...asUser(author),
          data: { content: "hello", id: parentId, type: testCase.type },
        })

        // The table the registry binds for this parent type must match the
        // table this case expects to write into.
        expect(
          getTableName(MESSAGE_PARENT_REGISTRY[testCase.type].messageTable),
        ).toBe(getTableName(testCase.messageTable))

        const stored = await db
          .select()
          .from(testCase.messageTable)
          .where(eq(testCase.messageTable.userId, author.id))
        expect(stored).toHaveLength(1)
        expect(stored[0]).toEqual(
          expect.objectContaining({ content: "hello", userId: author.id }),
        )
      })

      it("lists messages in createdAt-ascending order", async () => {
        const author = await seedUser({ name: "Author" })
        const parentId = await testCase.seedParent(author.id)
        const column = parentColumnKey(testCase.type)

        // Insert with explicit, out-of-order timestamps so the test asserts
        // ordering rather than insertion order.
        const base = new Date("2026-01-01T00:00:00Z")
        const rows = [
          { content: "third", offset: 3 },
          { content: "first", offset: 1 },
          { content: "second", offset: 2 },
        ]
        for (const row of rows) {
          await db.insert(testCase.messageTable).values({
            content: row.content,
            userId: author.id,
            createdAt: new Date(base.getTime() + row.offset * 1000),
            [column]: parentId,
          } as never)
        }

        const result = await listMessages({ type: testCase.type, id: parentId })
        expect(result.messages.map((m) => m.content)).toEqual([
          "first",
          "second",
          "third",
        ])
        // Each listed message carries its author and a likes array.
        expect(result.messages[0]).toEqual(
          expect.objectContaining({
            content: "first",
            user: expect.objectContaining({ id: author.id, name: "Author" }),
            likes: [],
          }),
        )
      })

      it("only returns the parent's own messages", async () => {
        const author = await seedUser({ name: "Author" })
        const parentA = await testCase.seedParent(author.id)
        const parentB = await testCase.seedParent(author.id)

        await createMessage({
          ...asUser(author),
          data: { content: "for A", id: parentA, type: testCase.type },
        })
        await createMessage({
          ...asUser(author),
          data: { content: "for B", id: parentB, type: testCase.type },
        })

        const resultA = await listMessages({ type: testCase.type, id: parentA })
        expect(resultA.messages.map((m) => m.content)).toEqual(["for A"])
      })
    })
  }
})

describe("messages notifications", () => {
  it("creates a comment notification and a mention notification without duplicating the owner", async () => {
    const author = await seedUser({ name: "Author" })
    const owner = await seedUser({ name: "Owner" })
    const mentioned = await seedUser({ name: "Mentioned" })

    const post = first(
      await db
        .insert(posts)
        .values({ content: "body", title: "Test post", userId: owner.id })
        .returning(),
    )

    await createMessage({
      ...asUser(author),
      data: {
        content: `hello @[${owner.id}] and @[${mentioned.id}]`,
        id: post.id,
        type: "post",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(2)
    })

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: author.id,
          entityId: post.id,
          entityType: "post",
          type: "comment",
          userId: owner.id,
        }),
        expect.objectContaining({
          actorId: author.id,
          entityId: post.id,
          entityType: "post",
          type: "mention",
          userId: mentioned.id,
        }),
      ]),
    )
  })

  it("deleteMessage deletes only the current user's message", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const post = first(
      await db
        .insert(posts)
        .values({ content: "body", title: "Test post", userId: owner.id })
        .returning(),
    )

    const ownersMessage = first(
      await db
        .insert(postMessages)
        .values({ content: "owner message", postId: post.id, userId: owner.id })
        .returning(),
    )
    const othersMessage = first(
      await db
        .insert(postMessages)
        .values({
          content: "other message",
          postId: post.id,
          userId: otherUser.id,
        })
        .returning(),
    )

    await deleteMessage({
      ...asUser(owner),
      data: { id: othersMessage.id, type: "post" },
    })
    await deleteMessage({
      ...asUser(owner),
      data: { id: ownersMessage.id, type: "post" },
    })

    const remaining = await db.query.postMessages.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })
    expect(remaining).toEqual([
      expect.objectContaining({
        content: "other message",
        id: othersMessage.id,
        userId: otherUser.id,
      }),
    ])
  })
})

describe("chat messages", () => {
  it("creates chat mention notifications with chat entity metadata and no owner comment notification", async () => {
    const author = await seedUser({ name: "Author" })
    const mentioned = await seedUser({ name: "Mentioned" })

    await createMessage({
      ...asUser(author),
      data: { content: `chat ping @[${mentioned.id}]`, id: -1, type: "chat" },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(1)
    })

    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, author.id))
    const rows = await db.query.notifications.findMany()

    expect(message).toBeTruthy()
    expect(rows).toEqual([
      expect.objectContaining({
        actorId: author.id,
        entityId: 0,
        entityType: "chat",
        type: "mention",
        userId: mentioned.id,
      }),
    ])
  })

  it("lists recent chat messages ascending and reports not focused", async () => {
    const author = await seedUser({ name: "Author" })
    const base = new Date()
    for (let i = 0; i < 3; i++) {
      await db.insert(chatMessages).values({
        content: `msg ${i}`,
        userId: author.id,
        createdAt: new Date(base.getTime() + i * 1000),
      })
    }

    const result = await listMessages({ type: "chat", id: -1 })
    expect(result.type).toBe("chatMessages")
    expect(result.focused).toBe(false)
    expect(result.messages.map((m) => m.content)).toEqual([
      "msg 0",
      "msg 1",
      "msg 2",
    ])
  })

  it("focus mode loads a window around an old target outside the default window", async () => {
    const author = await seedUser({ name: "Author" })

    // 130 messages older than 28 days, so the default window (recent +
    // backfill to 100 newest) cannot contain the earliest ones.
    const longAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
    const inserted = await db
      .insert(chatMessages)
      .values(
        Array.from({ length: 130 }, (_, i) => ({
          content: `old ${i}`,
          userId: author.id,
          createdAt: new Date(longAgo.getTime() + i * 1000),
        })),
      )
      .returning()

    // Target an early message the default window (newest 100) excludes.
    const target = inserted[5]
    invariant(target, "expected a target message")

    const result = await listMessages({
      type: "chat",
      id: -1,
      focus: target.id,
    })

    expect(result.focused).toBe(true)
    const ids = result.messages.map((m) => m.id)
    // The focused window contains the target and stays in ascending id order.
    expect(ids).toContain(target.id)
    expect(ids).toEqual([...ids].toSorted((a, b) => a - b))
  })

  it("focus on a recent target stays in the default window (not focused)", async () => {
    const author = await seedUser({ name: "Author" })
    const recent = await db
      .insert(chatMessages)
      .values(
        Array.from({ length: 5 }, (_, i) => ({
          content: `recent ${i}`,
          userId: author.id,
          createdAt: new Date(Date.now() - (5 - i) * 1000),
        })),
      )
      .returning()

    const targetRecent = recent[2]
    invariant(targetRecent, "expected a recent target message")

    const result = await listMessages({
      type: "chat",
      id: -1,
      focus: targetRecent.id,
    })

    // Target is already in the default window, so no separate focus window.
    expect(result.focused).toBe(false)
    expect(result.messages.map((m) => m.id)).toContain(targetRecent.id)
  })
})
