import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, count, desc, eq, isNull, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import { notifications } from "~/db/schema"
import { authMiddleware, authOptionalMiddleware } from "~/lib/middleware"
import {
  deleteNotificationSchema,
  listNotificationsSchema,
  markAllReadSchema,
  markGroupReadSchema,
  markReadSchema,
} from "~/lib/notifications/schemas"

type AuthenticatedContext = {
  user: {
    id: number
  }
}

type OptionalAuthContext = {
  user?: {
    id: number
  } | null
}

export const listNotificationsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listNotificationsSchema))
  .middleware([authMiddleware])
  .handler(listNotificationsImpl)

export async function listNotificationsImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    cursor?: number
    limit: number
    unreadOnly: boolean
  }
}) {
  const userId = context.user.id
  const { cursor, limit, unreadOnly } = input

  const conditions = [eq(notifications.userId, userId)]

  if (cursor) {
    conditions.push(lt(notifications.id, cursor))
  }

  if (unreadOnly) {
    conditions.push(isNull(notifications.readAt))
  }

  const results = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: desc(notifications.createdAt),
    limit: limit + 1,
    with: {
      actor: {
        columns: {
          id: true,
          name: true,
          avatarId: true,
        },
      },
    },
  })

  const hasMore = results.length > limit
  const items = hasMore ? results.slice(0, -1) : results
  const nextCursor = hasMore ? items.at(-1)?.id : undefined

  return {
    items,
    nextCursor,
  }
}

export const listGroupedNotificationsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listNotificationsSchema))
  .middleware([authMiddleware])
  .handler(listGroupedNotificationsImpl)

export async function listGroupedNotificationsImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    limit: number
    unreadOnly: boolean
  }
}) {
  const userId = context.user.id
  const { limit, unreadOnly } = input

  const whereConditions = [eq(notifications.userId, userId)]

  if (unreadOnly) {
    whereConditions.push(isNull(notifications.readAt))
  }

  const grouped = await db
    .select({
      type: notifications.type,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      count: count(),
      latestId: sql<number>`MAX(${notifications.id})`,
      latestAt: sql<Date>`MAX(${notifications.createdAt})`,
      isRead: sql<boolean>`COUNT(*) FILTER (WHERE ${notifications.readAt} IS NULL) = 0`,
      data: sql<string>`(array_agg(${notifications.data}::text ORDER BY ${notifications.createdAt} DESC))[1]`,
    })
    .from(notifications)
    .where(and(...whereConditions))
    .groupBy(
      notifications.type,
      notifications.entityType,
      notifications.entityId,
    )
    .orderBy(sql`MAX(${notifications.createdAt}) DESC`)
    .limit(limit)

  return Promise.all(
    grouped.map(async (group) => {
      const rows = await db.query.notifications.findMany({
        where: (table, operators) =>
          operators.and(
            operators.eq(table.userId, userId),
            operators.eq(table.type, group.type),
            operators.eq(table.entityType, group.entityType),
            operators.eq(table.entityId, group.entityId),
            unreadOnly ? operators.isNull(table.readAt) : undefined,
          ),
        orderBy: (table, operators) => [operators.desc(table.createdAt)],
        with: {
          actor: {
            columns: {
              id: true,
              name: true,
              avatarId: true,
            },
          },
        },
      })

      const seenActorIds = new Set<number>()
      const actors = []

      for (const row of rows) {
        if (!row.actor || seenActorIds.has(row.actor.id)) {
          continue
        }

        seenActorIds.add(row.actor.id)
        actors.push(row.actor)

        if (actors.length === 3) {
          break
        }
      }

      return {
        type: group.type,
        entityType: group.entityType,
        entityId: group.entityId,
        count: group.count,
        latestId: group.latestId,
        latestAt: group.latestAt,
        isRead: group.isRead,
        actors,
        data: group.data ? JSON.parse(group.data) : null,
      }
    }),
  )
}

export const getUnreadCountServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(getUnreadCountImpl)

export async function getUnreadCountImpl({
  context,
}: {
  context: OptionalAuthContext
}) {
  if (!context.user) return 0

  const userId = context.user.id

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))

  return result?.count ?? 0
}

export const markReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markReadSchema))
  .middleware([authMiddleware])
  .handler(markReadImpl)

export async function markReadImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    notificationId: number
  }
}) {
  const userId = context.user.id

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.userId, userId),
      ),
    )
}

export const markGroupReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markGroupReadSchema))
  .middleware([authMiddleware])
  .handler(markGroupReadImpl)

export async function markGroupReadImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    entityId: number
    entityType: (typeof notifications.$inferInsert)["entityType"]
    type: (typeof notifications.$inferInsert)["type"]
  }
}) {
  const userId = context.user.id

  // Mark only the requested notification group as read.
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, input.type),
        eq(notifications.entityType, input.entityType),
        eq(notifications.entityId, input.entityId),
      ),
    )
}

export const markAllReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markAllReadSchema))
  .middleware([authMiddleware])
  .handler(markAllReadImpl)

export async function markAllReadImpl({
  context,
}: {
  context: AuthenticatedContext
}) {
  const userId = context.user.id

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
}

export const deleteNotificationServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteNotificationSchema))
  .middleware([authMiddleware])
  .handler(deleteNotificationImpl)

export async function deleteNotificationImpl({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: {
    notificationId: number
  }
}) {
  const userId = context.user.id

  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, input.notificationId),
        eq(notifications.userId, userId),
      ),
    )
}
