import "@tanstack/react-start/server-only"
import { and, count, desc, eq, isNull, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  type NotificationEntityType,
  type NotificationType,
  notifications,
} from "~/db/schema"

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

export async function listNotifications({
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

export async function listGroupedNotifications({
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

  type GroupedRow = {
    type: NotificationType
    entity_type: NotificationEntityType
    entity_id: number
    count: number
    latest_id: number
    latest_at: number
    is_read: number
    data: string | null
    actors: string
  }

  const unread = unreadOnly ? 1 : 0

  // json_group_array has no ORDER BY clause in SQLite, so the actor list is
  // ordered by the inner subquery before aggregation; group `data` comes from
  // the group's latest row via max(id).
  const result = (await db.all(sql`
    WITH groups AS (
      SELECT
        type,
        entity_type,
        entity_id,
        count(*)                                                AS count,
        max(id)                                                 AS latest_id,
        max(created_at)                                         AS latest_at,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) = 0    AS is_read
      FROM notifications
      WHERE user_id = ${userId}
        AND (${unread} = 0 OR read_at IS NULL)
      GROUP BY type, entity_type, entity_id
      ORDER BY max(created_at) DESC
      LIMIT ${limit}
    )
    SELECT
      g.type,
      g.entity_type,
      g.entity_id,
      g.count,
      g.latest_id,
      g.latest_at,
      g.is_read,
      (SELECT d.data FROM notifications d WHERE d.id = g.latest_id) AS data,
      COALESCE(
        (
          SELECT json_group_array(
                   json_object('id', s.id, 'name', s.name, 'avatarId', s.avatar_id)
                 )
          FROM (
            SELECT u.id, u.name, u.avatar_id, max(n.created_at) AS last_at
            FROM notifications n
            JOIN users u ON u.id = n.actor_id
            WHERE n.user_id = ${userId}
              AND n.type = g.type
              AND n.entity_type = g.entity_type
              AND n.entity_id = g.entity_id
              AND (${unread} = 0 OR n.read_at IS NULL)
            GROUP BY u.id, u.name, u.avatar_id
            ORDER BY max(n.created_at) DESC
            LIMIT 3
          ) s
        ),
        '[]'
      ) AS actors
    FROM groups g
    ORDER BY g.latest_at DESC
  `)) as GroupedRow[]

  return result.map((row) => ({
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    count: row.count,
    latestId: row.latest_id,
    latestAt: new Date(row.latest_at),
    isRead: Boolean(row.is_read),
    actors: JSON.parse(row.actors) as {
      id: number
      name: string
      avatarId: string | null
    }[],
    data: row.data ? JSON.parse(row.data) : null,
  }))
}

export async function getUnreadCount({
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

export async function markRead({
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

export async function markGroupRead({
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

export async function markAllRead({
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

export async function deleteNotification({
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
