import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { notifications } from "~/db/schema"
import { deleteNotificationsForEntity } from "~/lib/notifications/helpers.server"
import {
  deleteNotification,
  getUnreadCount,
  listGroupedNotifications,
  listNotifications,
  markAllRead,
  markGroupRead,
  markRead,
} from "~/lib/notifications/ops.server"
import { asUser, seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("notifications integration", () => {
  it("listGrouped groups by entity, orders latest-first, and dedupes actors by recency", async () => {
    const user = await seedUser({ name: "Receiver" })
    const otherUser = await seedUser({ name: "Other Receiver" })
    const actorA = await seedUser({ name: "Actor A" })
    const actorB = await seedUser({ name: "Actor B" })
    const actorC = await seedUser({ name: "Actor C" })
    const actorD = await seedUser({ name: "Actor D" })

    await db.insert(notifications).values([
      {
        actorId: actorC.id,
        createdAt: new Date("2024-01-01T09:00:00Z"),
        data: { actorName: actorC.name, entityTitle: "Like group oldest" },
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actorA.id,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        data: { actorName: actorA.name, entityTitle: "Like group old" },
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actorB.id,
        createdAt: new Date("2024-01-01T11:00:00Z"),
        data: { actorName: actorB.name, entityTitle: "Like group mid" },
        entityId: 10,
        entityType: "post",
        readAt: new Date("2024-01-01T11:05:00Z"),
        type: "like",
        userId: user.id,
      },
      {
        actorId: actorA.id,
        createdAt: new Date("2024-01-01T12:00:00Z"),
        data: { actorName: actorA.name, entityTitle: "Like group latest" },
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actorD.id,
        createdAt: new Date("2024-01-01T13:00:00Z"),
        data: { actorName: actorD.name, entityTitle: "Comment group latest" },
        entityId: 11,
        entityType: "post",
        readAt: new Date("2024-01-01T13:05:00Z"),
        type: "comment",
        userId: user.id,
      },
      {
        actorId: actorD.id,
        createdAt: new Date("2024-01-01T14:00:00Z"),
        entityId: 99,
        entityType: "post",
        type: "comment",
        userId: otherUser.id,
      },
    ])

    const groups = await listGroupedNotifications({
      ...asUser(user),
      data: {
        limit: 10,
        unreadOnly: false,
      },
    })

    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual(
      expect.objectContaining({
        count: 1,
        entityId: 11,
        entityType: "post",
        isRead: true,
        type: "comment",
      }),
    )
    expect(groups[0]?.actors.map((actor) => actor.id)).toEqual([actorD.id])

    expect(groups[1]).toEqual(
      expect.objectContaining({
        count: 4,
        entityId: 10,
        entityType: "post",
        isRead: false,
        type: "like",
      }),
    )
    expect(groups[1]?.actors.map((actor) => actor.id)).toEqual([
      actorA.id,
      actorB.id,
      actorC.id,
    ])
    expect(groups[1]?.data).toEqual(
      expect.objectContaining({
        actorName: actorA.name,
        entityTitle: "Like group latest",
      }),
    )
  })

  it("listGrouped unreadOnly filters out read groups and counts only unread rows", async () => {
    const user = await seedUser({ name: "Receiver" })
    const actorA = await seedUser({ name: "Actor A" })
    const actorB = await seedUser({ name: "Actor B" })

    await db.insert(notifications).values([
      {
        actorId: actorA.id,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        entityId: 20,
        entityType: "post",
        readAt: new Date("2024-01-01T10:10:00Z"),
        type: "like",
        userId: user.id,
      },
      {
        actorId: actorA.id,
        createdAt: new Date("2024-01-01T11:00:00Z"),
        entityId: 21,
        entityType: "post",
        readAt: new Date("2024-01-01T11:10:00Z"),
        type: "like",
        userId: user.id,
      },
      {
        actorId: actorB.id,
        createdAt: new Date("2024-01-01T12:00:00Z"),
        entityId: 21,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
    ])

    const groups = await listGroupedNotifications({
      ...asUser(user),
      data: {
        limit: 10,
        unreadOnly: true,
      },
    })

    expect(groups).toEqual([
      expect.objectContaining({
        count: 1,
        entityId: 21,
        entityType: "post",
        isRead: false,
        type: "like",
      }),
    ])
    expect(groups[0]?.actors.map((actor) => actor.id)).toEqual([actorB.id])
  })

  it("listNotifications paginates by cursor, filters unread rows, and scopes to the current user", async () => {
    const user = await seedUser({ name: "Receiver" })
    const otherUser = await seedUser({ name: "Other Receiver" })
    const actor = await seedUser({ name: "Actor" })

    await db.insert(notifications).values([
      {
        actorId: actor.id,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        entityId: 1,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actor.id,
        createdAt: new Date("2024-01-01T11:00:00Z"),
        entityId: 2,
        entityType: "post",
        type: "comment",
        userId: user.id,
      },
      {
        actorId: actor.id,
        createdAt: new Date("2024-01-01T12:00:00Z"),
        entityId: 3,
        entityType: "post",
        readAt: new Date("2024-01-01T12:05:00Z"),
        type: "mention",
        userId: user.id,
      },
      {
        actorId: actor.id,
        createdAt: new Date("2024-01-01T13:00:00Z"),
        entityId: 4,
        entityType: "post",
        type: "follow",
        userId: user.id,
      },
      {
        actorId: actor.id,
        createdAt: new Date("2024-01-01T14:00:00Z"),
        entityId: 5,
        entityType: "post",
        type: "follow",
        userId: otherUser.id,
      },
    ])

    const firstPage = await listNotifications({
      ...asUser(user),
      data: {
        limit: 2,
        unreadOnly: false,
      },
    })

    expect(firstPage.items.map((item) => item.entityId)).toEqual([4, 3])
    expect(firstPage.nextCursor).toBe(firstPage.items[1]?.id)

    const secondPage = await listNotifications({
      ...asUser(user),
      data: {
        cursor: firstPage.nextCursor,
        limit: 2,
        unreadOnly: false,
      },
    })

    expect(secondPage.items.map((item) => item.entityId)).toEqual([2, 1])
    expect(secondPage.nextCursor).toBeUndefined()

    const unreadOnly = await listNotifications({
      ...asUser(user),
      data: {
        limit: 10,
        unreadOnly: true,
      },
    })

    expect(unreadOnly.items.map((item) => item.entityId)).toEqual([4, 2, 1])
  })

  it("getUnreadCount is auth-optional and scoped per user", async () => {
    const user = await seedUser({ name: "Receiver" })
    const otherUser = await seedUser({ name: "Other Receiver" })
    const actor = await seedUser({ name: "Actor" })

    await db.insert(notifications).values([
      {
        actorId: actor.id,
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actor.id,
        entityId: 11,
        entityType: "post",
        readAt: new Date("2024-01-01T00:00:00Z"),
        type: "comment",
        userId: user.id,
      },
      {
        actorId: actor.id,
        entityId: 12,
        entityType: "post",
        type: "mention",
        userId: otherUser.id,
      },
    ])

    await expect(
      getUnreadCount({
        context: {},
      } as Parameters<typeof getUnreadCount>[0]),
    ).resolves.toBe(0)

    await expect(
      getUnreadCount({
        ...asUser(user),
      }),
    ).resolves.toBe(1)
  })

  it("markRead marks only the targeted notification for the current user", async () => {
    const user = await seedUser({ name: "Receiver" })
    const actor = await seedUser({ name: "Actor" })

    const [target] = await db
      .insert(notifications)
      .values([
        {
          actorId: actor.id,
          entityId: 10,
          entityType: "post",
          type: "like",
          userId: user.id,
        },
        {
          actorId: actor.id,
          entityId: 10,
          entityType: "post",
          type: "comment",
          userId: user.id,
        },
      ])
      .returning()

    await markRead({
      ...asUser(user),
      data: {
        notificationId: target.id,
      },
    })

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows[0]?.readAt).toBeInstanceOf(Date)
    expect(rows[1]?.readAt).toBeNull()
  })

  it("markGroupRead respects type, entityType, and entityId", async () => {
    const user = await seedUser({ name: "Receiver" })
    const actor = await seedUser({ name: "Actor" })

    await db.insert(notifications).values([
      {
        actorId: actor.id,
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actor.id,
        entityId: 10,
        entityType: "post",
        type: "comment",
        userId: user.id,
      },
      {
        actorId: actor.id,
        entityId: 11,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
    ])

    await markGroupRead({
      ...asUser(user),
      data: {
        entityId: 10,
        entityType: "post",
        type: "like",
      },
    })

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows[0]?.readAt).toBeInstanceOf(Date)
    expect(rows[1]?.readAt).toBeNull()
    expect(rows[2]?.readAt).toBeNull()
  })

  it("markAllRead updates only unread notifications for the current user", async () => {
    const user = await seedUser({ name: "Receiver" })
    const actor = await seedUser({ name: "Actor" })

    await db.insert(notifications).values([
      {
        actorId: actor.id,
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      },
      {
        actorId: actor.id,
        entityId: 11,
        entityType: "post",
        readAt: new Date("2024-01-01T00:00:00Z"),
        type: "comment",
        userId: user.id,
      },
    ])

    await markAllRead(asUser(user))

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows[0]?.readAt).toBeInstanceOf(Date)
    expect(rows[1]?.readAt?.toISOString()).toBe("2024-01-01T00:00:00.000Z")
  })

  it("deleteNotificationsForEntity removes all notifications for that entity across users", async () => {
    const userA = await seedUser({ name: "User A" })
    const userB = await seedUser({ name: "User B" })
    const actor = await seedUser({ name: "Actor" })

    await db.insert(notifications).values([
      // Two notifications for entity post:42 (different users)
      {
        actorId: actor.id,
        entityId: 42,
        entityType: "post",
        type: "like",
        userId: userA.id,
      },
      {
        actorId: actor.id,
        entityId: 42,
        entityType: "post",
        type: "comment",
        userId: userB.id,
      },
      // Same entityId but different entityType — should NOT be deleted
      {
        actorId: actor.id,
        entityId: 42,
        entityType: "riuSet",
        type: "like",
        userId: userA.id,
      },
      // Different entityId same entityType — should NOT be deleted
      {
        actorId: actor.id,
        entityId: 99,
        entityType: "post",
        type: "like",
        userId: userA.id,
      },
    ])

    await deleteNotificationsForEntity("post", 42)

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.entityType).toBe("riuSet")
    expect(rows[0]?.entityId).toBe(42)
    expect(rows[1]?.entityType).toBe("post")
    expect(rows[1]?.entityId).toBe(99)
  })

  it("deleteNotificationsForEntity is a no-op when no notifications exist", async () => {
    const user = await seedUser({ name: "User" })
    const actor = await seedUser({ name: "Actor" })

    await db.insert(notifications).values({
      actorId: actor.id,
      entityId: 10,
      entityType: "post",
      type: "like",
      userId: user.id,
    })

    // Delete for a non-existent entity — nothing should change
    await deleteNotificationsForEntity("post", 999)

    const rows = await db.query.notifications.findMany()
    expect(rows).toHaveLength(1)
  })

  it("deleteNotification deletes only the current user's row", async () => {
    const user = await seedUser({ name: "Receiver" })
    const otherUser = await seedUser({ name: "Other Receiver" })
    const actor = await seedUser({ name: "Actor" })

    const [usersNotification] = await db
      .insert(notifications)
      .values({
        actorId: actor.id,
        entityId: 10,
        entityType: "post",
        type: "like",
        userId: user.id,
      })
      .returning()
    await db.insert(notifications).values({
      actorId: actor.id,
      entityId: 10,
      entityType: "post",
      type: "like",
      userId: otherUser.id,
    })

    await deleteNotification({
      ...asUser(otherUser),
      data: {
        notificationId: usersNotification.id,
      },
    })

    await deleteNotification({
      ...asUser(user),
      data: {
        notificationId: usersNotification.id,
      },
    })

    const rows = await db.query.notifications.findMany({
      orderBy: (table, { asc }) => [asc(table.id)],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(otherUser.id)
  })
})
