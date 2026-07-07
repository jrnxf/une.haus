import "@tanstack/react-start/server-only"
import { and, eq } from "drizzle-orm"
import { type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core"

import { db } from "~/db"
import {
  NOTIFICATION_ENTITY_TYPES,
  type NotificationEntityType,
} from "~/db/schema"
import { columnKey } from "~/lib/engagement/column-key.server"
import { ENTITY_REGISTRY } from "~/lib/engagement/registry.server"
import { invariant } from "~/lib/invariant"
import { logRejection } from "~/lib/logger"
import { createNotification } from "~/lib/notifications/helpers.server"
import { type RecordWithLikes } from "~/lib/reactions/schemas"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

// A `*_likes` row is the liked record's foreign key plus the acting user.
type LikeRow = { userId: number } & Record<string, number>

const NOTIFICATION_ENTITY_TYPE_SET: ReadonlySet<string> = new Set(
  NOTIFICATION_ENTITY_TYPES,
)

/**
 * Every `*_likes` table pairs its foreign key with a `userId` column (composite
 * PK). Drizzle's `PgTable` is untyped at this seam, so reach the column by name
 * with a narrow cast rather than threading each concrete table type through.
 */
function userIdColumn(table: PgTable): AnyPgColumn {
  return (table as unknown as Record<string, AnyPgColumn>).userId
}

/**
 * Content entity types share their key with a notification entity type (a like
 * on a `post` notifies about the `post`). The reactable union is wider than
 * `NotificationEntityType` (it also covers message types), so narrow here; the
 * invariant only fires if a content type lacks a matching notification type.
 */
function asNotificationEntityType(type: string): NotificationEntityType {
  invariant(
    NOTIFICATION_ENTITY_TYPE_SET.has(type),
    `content type "${type}" has no matching notification entity type`,
  )
  return type as NotificationEntityType
}

export async function likeRecord({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: RecordWithLikes
}) {
  const userId = context.user.id

  const { recordId, type } = input

  const binding = ENTITY_REGISTRY[type]

  const result = await db
    .insert(binding.likesTable)
    .values({
      // The foreign-key column comes from the registry — never reconstructed at
      // runtime from `${type}Id`, the documented silent-failure source.
      [columnKey(binding.likesTable, binding.fkColumn)]: recordId,
      userId,
    } satisfies LikeRow)
    // A like is a single mark: the composite (fk, userId) primary key makes a
    // repeated like a no-op rather than a duplicate-key error. `returning()`
    // yields no rows on conflict, which gates the notification below so a
    // double-like never re-notifies.
    .onConflictDoNothing()
    .returning()

  const inserted = result.length > 0
  if (!inserted) {
    return result
  }

  if (binding.kind === "content") {
    // A like on content notifies the content owner.
    const ownerId = await binding.resolveOwner(recordId)
    if (ownerId && ownerId !== userId) {
      createNotification({
        userId: ownerId,
        actorId: userId,
        type: binding.notificationType,
        entityType: asNotificationEntityType(type),
        entityId: recordId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
        },
      }).catch(logRejection("reactions.notify"))
    }
  } else {
    // A like on a message notifies the message author. The notification points
    // at the message's *parent* entity (so the recipient lands on the thread).
    // The binding resolves both the author and the parent reference from the
    // registry — no parallel `switch` in the notifications module.
    const target = await binding.resolveMessageTarget(recordId)
    if (target && target.ownerId !== userId) {
      createNotification({
        userId: target.ownerId,
        actorId: userId,
        type: binding.notificationType,
        entityType: target.parentEntityType,
        entityId: target.parentEntityId,
        data: {
          actorName: context.user.name,
          actorAvatarId: context.user.avatarId,
          messageId: recordId,
        },
      }).catch(logRejection("reactions.notify"))
    }
  }

  return result
}

export async function unlikeRecord({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: RecordWithLikes
}) {
  const userId = context.user.id

  const { recordId, type } = input

  const { likesTable, fkColumn } = ENTITY_REGISTRY[type]

  return await db
    .delete(likesTable)
    .where(and(eq(fkColumn, recordId), eq(userIdColumn(likesTable), userId)))
    .returning()
}
