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
    latest_at: Date
    is_read: boolean
    data: string | null
    actors: { id: number; name: string; avatarId: string | null }[]
  }

  const result = await db.execute<GroupedRow>(sql`
    WITH groups AS (
      SELECT
        type,
        entity_type,
        entity_id,
        count(*)::int                                       AS count,
        max(id)::int                                        AS latest_id,
        max(created_at)                                     AS latest_at,
        (count(*) FILTER (WHERE read_at IS NULL)) = 0       AS is_read,
        (array_agg(data::text ORDER BY created_at DESC))[1] AS data
      FROM notifications
      WHERE user_id = ${userId}
        AND (${unreadOnly} = false OR read_at IS NULL)
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
      g.data,
      COALESCE(a.actors, '[]'::json) AS actors
    FROM groups g
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object('id', s.id, 'name', s.name, 'avatarId', s.avatar_id)
               ORDER BY s.last_at DESC
             ) AS actors
      FROM (
        SELECT u.id, u.name, u.avatar_id, max(n.created_at) AS last_at
        FROM notifications n
        JOIN users u ON u.id = n.actor_id
        WHERE n.user_id = ${userId}
          AND n.type = g.type
          AND n.entity_type = g.entity_type
          AND n.entity_id = g.entity_id
          AND (${unreadOnly} = false OR n.read_at IS NULL)
        GROUP BY u.id, u.name, u.avatar_id
        ORDER BY max(n.created_at) DESC
        LIMIT 3
      ) s
    ) a ON true
    ORDER BY g.latest_at DESC
  `)

  return result.map((row) => ({
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    count: row.count,
    latestId: row.latest_id,
    latestAt: row.latest_at,
    isRead: row.is_read,
    actors: row.actors,
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
