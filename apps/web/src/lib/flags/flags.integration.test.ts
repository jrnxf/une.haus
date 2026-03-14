import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { flags, postMessages, posts } from "~/db/schema"
import { flagContent, resolveFlag } from "~/lib/flags/ops.server"
import { asUser, seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("flags integration", () => {
  it("flagContent rejects duplicate unresolved flags, routes message flags to the parent entity, and notifies admins", async () => {
    const adminA = await seedUser({ name: "Admin A", type: "admin" })
    const adminB = await seedUser({ name: "Admin B", type: "admin" })
    const flagger = await seedUser({ name: "Flagger" })
    const owner = await seedUser({ name: "Owner" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Flagged Post",
        userId: owner.id,
      })
      .returning()
    const [message] = await db
      .insert(postMessages)
      .values({
        content: "bad message",
        postId: post.id,
        userId: owner.id,
      })
      .returning()

    const flag = await flagContent({
      ...asUser(flagger),
      data: {
        entityId: message.id,
        entityType: "postMessage",
        parentEntityId: post.id,
        reason: "spam",
      },
    })

    await expect(
      flagContent({
        ...asUser(flagger),
        data: {
          entityId: message.id,
          entityType: "postMessage",
          parentEntityId: post.id,
          reason: "spam again",
        },
      }),
    ).rejects.toThrow("You have already flagged this content")

    const persistedFlags = await db.query.flags.findMany()
    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.userId)],
    })

    expect(flag).toEqual(
      expect.objectContaining({
        entityId: message.id,
        entityType: "postMessage",
        parentEntityId: post.id,
        reason: "spam",
        userId: flagger.id,
      }),
    )
    expect(persistedFlags).toHaveLength(1)
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: flagger.id,
          entityId: post.id,
          entityType: "post",
          type: "flag",
          userId: adminA.id,
        }),
        expect.objectContaining({
          actorId: flagger.id,
          entityId: post.id,
          entityType: "post",
          type: "flag",
          userId: adminB.id,
        }),
      ]),
    )
  })

  it("resolveFlag persists the resolution, notifies the original flagger, and rejects a second resolution", async () => {
    const admin = await seedUser({ name: "Admin", type: "admin" })
    const flagger = await seedUser({ name: "Flagger" })

    const [post] = await db
      .insert(posts)
      .values({
        content: "body",
        title: "Review Me",
        userId: flagger.id,
      })
      .returning()
    const [flag] = await db
      .insert(flags)
      .values({
        entityId: post.id,
        entityType: "post",
        reason: "needs review",
        userId: flagger.id,
      })
      .returning()

    const updated = await resolveFlag({
      ...asUser(admin),
      data: {
        flagId: flag.id,
        resolution: "removed",
      },
    })

    await expect(
      resolveFlag({
        ...asUser(admin),
        data: {
          flagId: flag.id,
          resolution: "dismissed",
        },
      }),
    ).rejects.toThrow("Flag is already resolved")

    const rows = await db.query.notifications.findMany()

    expect(updated).toEqual(
      expect.objectContaining({
        id: flag.id,
        resolution: "removed",
        resolvedByUserId: admin.id,
      }),
    )
    expect(updated.resolvedAt).toBeInstanceOf(Date)
    expect(rows).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        entityId: post.id,
        entityType: "post",
        type: "review",
        userId: flagger.id,
      }),
    ])
  })
})
