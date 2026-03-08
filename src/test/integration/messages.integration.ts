import { beforeEach, describe, expect, it } from "bun:test"
import { eq } from "drizzle-orm"

import { asUser, seedUser, truncatePublicTables, waitFor } from "./helpers"
import { db } from "~/db"
import { chatMessages, postMessages, posts } from "~/db/schema"
import {
  createMessageImpl,
  deleteMessageImpl,
  updateMessageImpl,
} from "~/lib/messages/fns"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("messages integration", () => {
  it("creates a comment notification and a mention notification without duplicating the owner", async () => {
    const author = await seedUser({ name: "Author" })
    const owner = await seedUser({ name: "Owner" })
    const mentioned = await seedUser({ name: "Mentioned" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Test post",
        userId: owner.id,
      })
      .returning()

    await createMessageImpl({
      ...asUser(author),
      data: {
        content: `hello @[${owner.id}] and @[${mentioned.id}]`,
        id: post.id,
        type: "post",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany({
        orderBy: (table, { asc }) => [asc(table.id)],
      })

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

  it("creates chat mention notifications with chat entity metadata and no owner comment notification", async () => {
    const author = await seedUser({ name: "Author" })
    const mentioned = await seedUser({ name: "Mentioned" })

    await createMessageImpl({
      ...asUser(author),
      data: {
        content: `chat ping @[${mentioned.id}]`,
        id: -1,
        type: "chat",
      },
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

  it("updateMessage only notifies newly added mentions and uses the parent entity id", async () => {
    const author = await seedUser({ name: "Author" })
    const owner = await seedUser({ name: "Owner" })
    const existingMention = await seedUser({ name: "Existing Mention" })
    const newMention = await seedUser({ name: "New Mention" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Test post",
        userId: owner.id,
      })
      .returning()

    await createMessageImpl({
      ...asUser(author),
      data: {
        content: `hello @[${existingMention.id}]`,
        id: post.id,
        type: "post",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(2)
    })

    const [message] = await db
      .select()
      .from(postMessages)
      .where(eq(postMessages.userId, author.id))

    expect(message).toBeTruthy()

    await updateMessageImpl({
      ...asUser(author),
      data: {
        content: `hello again @[${existingMention.id}] @[${newMention.id}] @[${author.id}]`,
        id: message!.id,
        type: "post",
      },
    })

    await waitFor(async () => {
      const rows = await db.query.notifications.findMany()
      expect(rows).toHaveLength(3)
    })

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })
    const mentionRows = rows.filter((row) => row.type === "mention")

    expect(
      mentionRows.filter((row) => row.userId === existingMention.id),
    ).toHaveLength(1)
    expect(
      mentionRows.filter((row) => row.userId === newMention.id),
    ).toHaveLength(1)
    expect(mentionRows.find((row) => row.userId === author.id)).toBeUndefined()
    expect(mentionRows.find((row) => row.userId === newMention.id)).toEqual(
      expect.objectContaining({
        actorId: author.id,
        entityId: post.id,
        entityType: "post",
        type: "mention",
        userId: newMention.id,
      }),
    )
  })

  it("deleteMessage deletes only the current user's message", async () => {
    const owner = await seedUser({ name: "Owner" })
    const otherUser = await seedUser({ name: "Other User" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Test post",
        userId: owner.id,
      })
      .returning()

    const [ownersMessage] = await db
      .insert(postMessages)
      .values({
        content: "owner message",
        postId: post.id,
        userId: owner.id,
      })
      .returning()
    const [othersMessage] = await db
      .insert(postMessages)
      .values({
        content: "other message",
        postId: post.id,
        userId: otherUser.id,
      })
      .returning()

    await deleteMessageImpl({
      ...asUser(owner),
      data: {
        id: othersMessage.id,
        type: "post",
      },
    })

    await deleteMessageImpl({
      ...asUser(owner),
      data: {
        id: ownersMessage.id,
        type: "post",
      },
    })

    const remainingMessages = await db.query.postMessages.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(remainingMessages).toEqual([
      expect.objectContaining({
        content: "other message",
        id: othersMessage.id,
        userId: otherUser.id,
      }),
    ])
  })
})
