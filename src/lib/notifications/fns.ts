import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, count, desc, eq, isNull, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import { notifications } from "~/db/schema"
import { authMiddleware } from "~/lib/middleware"
import {
  deleteNotificationSchema,
  listNotificationsSchema,
  markAllReadSchema,
  markGroupReadSchema,
  markReadSchema,
} from "~/lib/notifications/schemas"

export const listNotificationsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listNotificationsSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id
    const { cursor, limit, unreadOnly } = input

    // Build where conditions
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
  })

export const listGroupedNotificationsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listNotificationsSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id
    const { limit, unreadOnly } = input

    // Build where conditions for grouping query
    const whereConditions = [eq(notifications.userId, userId)]

    if (unreadOnly) {
      whereConditions.push(isNull(notifications.readAt))
    }

    // Group notifications by type, entityType, and entityId
    const grouped = await db
      .select({
        type: notifications.type,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        count: count(),
        latestId: sql<number>`MAX(${notifications.id})`,
        latestAt: sql<Date>`MAX(${notifications.createdAt})`,
        // Check if all notifications in this group are read
        isRead: sql<boolean>`COUNT(*) FILTER (WHERE ${notifications.readAt} IS NULL) = 0`,
        // Get the most recent unique actor IDs (up to 3)
        actorIds: sql<number[]>`
          (
                    SELECT ARRAY_AGG(top_actors.actor_id)
                    FROM (
                      SELECT unique_actors.actor_id
                      FROM (
                        SELECT DISTINCT ON (n2.actor_id) n2.actor_id, n2.created_at
                        FROM ${notifications} n2
                        WHERE n2.user_id = ${userId}
                          AND n2.type = ${notifications.type}
                          AND n2.entity_type = ${notifications.entityType}
                          AND n2.entity_id = ${notifications.entityId}
                          ${unreadOnly ? sql`AND n2.read_at IS NULL` : sql``}
                        ORDER BY n2.actor_id, n2.created_at DESC
                      ) unique_actors
                      ORDER BY unique_actors.created_at DESC
                      LIMIT 3
                    ) top_actors
                  )
        `,
        // Get the data from the most recent notification in this group
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

    // Fetch actor details for the grouped notifications
    const allActorIds = [...new Set(grouped.flatMap((g) => g.actorIds || []))]

    const actorDetails =
      allActorIds.length > 0
        ? await db.query.users.findMany({
            where: (users, { inArray }) => inArray(users.id, allActorIds),
            columns: {
              id: true,
              name: true,
              avatarId: true,
            },
          })
        : []

    const actorMap = new Map(actorDetails.map((a) => [a.id, a]))

    return grouped.map((g) => ({
      type: g.type,
      entityType: g.entityType,
      entityId: g.entityId,
      count: g.count,
      latestId: g.latestId,
      latestAt: g.latestAt,
      isRead: g.isRead,
      actors: (g.actorIds || []).map((id) => actorMap.get(id)).filter(Boolean),
      data: g.data ? JSON.parse(g.data) : null,
    }))
  })

export const getUnreadCountServerFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      )

    return result?.count ?? 0
  })

export const markReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markReadSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
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
  })

export const markGroupReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markGroupReadSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    // Mark all notifications in this group as read
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.entityType, input.entityType),
          eq(notifications.entityId, input.entityId),
        ),
      )
  })

export const markAllReadServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(markAllReadSchema))
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.user.id

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      )
  })

export const deleteNotificationServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteNotificationSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const userId = context.user.id

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, input.notificationId),
          eq(notifications.userId, userId),
        ),
      )
  })
