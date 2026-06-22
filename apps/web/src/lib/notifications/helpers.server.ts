import "@tanstack/react-start/server-only"
import { and, eq, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  type NotificationEntityType,
  type NotificationType,
  notifications,
  userFollows,
  userNotificationSettings,
} from "~/db/schema"
import { type CreateNotificationInput } from "~/lib/notifications/schemas"

export type NotificationPreferences = {
  likesEnabled: boolean
  commentsEnabled: boolean
  followsEnabled: boolean
  newContentEnabled: boolean
  mentionsEnabled: boolean
  gameActivityEnabled: boolean
}

const SYSTEM_TYPES: ReadonlySet<NotificationType> = new Set([
  "archive_request",
  "chain_archived",
  "review",
  "flag",
])

const TYPE_TO_SETTING: Partial<
  Record<NotificationType, keyof NotificationPreferences>
> = {
  like: "likesEnabled",
  message_like: "likesEnabled",
  comment: "commentsEnabled",
  follow: "followsEnabled",
  new_content: "newContentEnabled",
  mention: "mentionsEnabled",
  game_activity: "gameActivityEnabled",
}

/**
 * Pure decision function: should a notification be created?
 * Returns false for self-notifications or when user preferences disable the type.
 * System notifications (archive_request, chain_archived, review, flag) bypass preferences.
 */
export function shouldCreateNotification(
  input: Pick<CreateNotificationInput, "actorId" | "userId" | "type">,
  settings: NotificationPreferences | null,
): boolean {
  // Don't notify yourself
  if (input.actorId && input.actorId === input.userId) {
    return false
  }

  // System notifications always go through
  if (SYSTEM_TYPES.has(input.type)) {
    return true
  }

  // No settings means all defaults (enabled)
  if (!settings) {
    return true
  }

  const settingKey = TYPE_TO_SETTING[input.type]
  if (settingKey && !settings[settingKey]) {
    return false
  }

  return true
}

/**
 * Creates a single notification.
 * Checks that actor !== recipient to avoid self-notifications.
 * Respects user notification preferences.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  // Check user preferences
  const settings = await db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, input.userId),
  })

  if (!shouldCreateNotification(input, settings ?? null)) {
    return
  }

  await db.insert(notifications).values({
    userId: input.userId,
    actorId: input.actorId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    data: input.data,
  })
}

/**
 * Creates notifications for all followers of a user.
 * Used when a followed user creates new content.
 */
export async function notifyFollowers(args: {
  actorId: number
  actorName: string
  actorAvatarId?: string | null
  type: "new_content"
  entityType: NotificationEntityType
  entityId: number
  entityTitle?: string
}): Promise<void> {
  // Get all followers of this user
  const followers = await db
    .select({ followedByUserId: userFollows.followedByUserId })
    .from(userFollows)
    .where(eq(userFollows.followedUserId, args.actorId))

  if (followers.length === 0) return

  // Get notification settings for all followers to filter
  const followerIds = followers.map((f) => f.followedByUserId)

  // Get settings for followers who have disabled new_content
  const disabledSettings = await db.query.userNotificationSettings.findMany({
    where: (settings, { and, inArray, eq: eqOp }) =>
      and(
        inArray(settings.userId, followerIds),
        eqOp(settings.newContentEnabled, false),
      ),
    columns: { userId: true },
  })

  const disabledUserIds = new Set(disabledSettings.map((s) => s.userId))

  // Filter out users who have disabled new_content notifications
  const enabledFollowers = followers.filter(
    (f) => !disabledUserIds.has(f.followedByUserId),
  )

  if (enabledFollowers.length === 0) return

  // Batch insert all follower notifications
  await db.insert(notifications).values(
    enabledFollowers.map((f) => ({
      userId: f.followedByUserId,
      actorId: args.actorId,
      type: args.type as NotificationType,
      entityType: args.entityType,
      entityId: args.entityId,
      data: {
        actorName: args.actorName,
        actorAvatarId: args.actorAvatarId,
        entityTitle: args.entityTitle,
      },
    })),
  )
}

/**
 * Deletes all notifications for a given entity.
 * Call this when the entity behind a notification is deleted
 * so that orphan notifications silently disappear.
 */
export async function deleteNotificationsForEntity(
  entityType: NotificationEntityType,
  entityId: number,
): Promise<void> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.entityType, entityType),
        eq(notifications.entityId, entityId),
      ),
    )
}

/**
 * Deletes message_like notifications for a specific message.
 * Filters by entityType to prevent cross-table message ID collisions.
 */
export async function deleteNotificationsForMessage(
  entityType: NotificationEntityType,
  messageId: number,
): Promise<void> {
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.type, "message_like"),
        eq(notifications.entityType, entityType),
        sql`(${notifications.data}->>'messageId')::int = ${messageId}`,
      ),
    )
}
