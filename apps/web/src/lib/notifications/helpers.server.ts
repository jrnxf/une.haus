import "@tanstack/react-start/server-only"
import { and, eq, sql } from "drizzle-orm"

import { db } from "~/db"
import {
  biuSetMessages,
  chatMessages,
  type NotificationEntityType,
  type NotificationType,
  notifications,
  postMessages,
  riuSetMessages,
  riuSubmissionMessages,
  siuSetMessages,
  userFollows,
  userNotificationSettings,
  utvVideoMessages,
} from "~/db/schema"
import { type CreateNotificationInput } from "~/lib/notifications/schemas"

export type NotificationPreferences = {
  likesEnabled: boolean
  commentsEnabled: boolean
  followsEnabled: boolean
  newContentEnabled: boolean
  mentionsEnabled: boolean
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
 * Helper to get owner of content for notification targeting.
 * Returns null if content doesn't exist or has no owner.
 */
export async function getContentOwner(
  entityType: NotificationEntityType,
  entityId: number,
): Promise<number | null> {
  switch (entityType) {
    case "post": {
      const post = await db.query.posts.findFirst({
        where: (posts, { eq: eqOp }) => eqOp(posts.id, entityId),
        columns: { userId: true },
      })
      return post?.userId ?? null
    }
    case "riuSet": {
      const set = await db.query.riuSets.findFirst({
        where: (sets, { eq: eqOp }) => eqOp(sets.id, entityId),
        columns: { userId: true },
      })
      return set?.userId ?? null
    }
    case "riuSubmission": {
      const sub = await db.query.riuSubmissions.findFirst({
        where: (subs, { eq: eqOp }) => eqOp(subs.id, entityId),
        columns: { userId: true },
      })
      return sub?.userId ?? null
    }
    case "biuSet": {
      const set = await db.query.biuSets.findFirst({
        where: (sets, { eq: eqOp }) => eqOp(sets.id, entityId),
        columns: { userId: true },
      })
      return set?.userId ?? null
    }
    case "siuSet": {
      const set = await db.query.siuSets.findFirst({
        where: (sets, { eq: eqOp }) => eqOp(sets.id, entityId),
        columns: { userId: true },
      })
      return set?.userId ?? null
    }
    case "siu": {
      // SIU rounds don't have a single owner
      return null
    }
    case "utvVideo": {
      // UTV videos don't have owners (legacy content)
      return null
    }
    case "utvVideoSuggestion": {
      const suggestion = await db.query.utvVideoSuggestions.findFirst({
        where: (subs, { eq: eqOp }) => eqOp(subs.id, entityId),
        columns: { submittedByUserId: true },
      })
      return suggestion?.submittedByUserId ?? null
    }
    case "trickSubmission": {
      const submission = await db.query.trickSubmissions.findFirst({
        where: (subs, { eq: eqOp }) => eqOp(subs.id, entityId),
        columns: { submittedByUserId: true },
      })
      return submission?.submittedByUserId ?? null
    }
    case "trickSuggestion": {
      const suggestion = await db.query.trickSuggestions.findFirst({
        where: (subs, { eq: eqOp }) => eqOp(subs.id, entityId),
        columns: { submittedByUserId: true },
      })
      return suggestion?.submittedByUserId ?? null
    }
    case "trickVideo": {
      const video = await db.query.trickVideos.findFirst({
        where: (videos, { eq: eqOp }) => eqOp(videos.id, entityId),
        columns: { submittedByUserId: true },
      })
      return video?.submittedByUserId ?? null
    }
    case "glossaryProposal": {
      const proposal = await db.query.glossaryProposals.findFirst({
        where: (proposals, { eq: eqOp }) => eqOp(proposals.id, entityId),
        columns: { submittedByUserId: true },
      })
      return proposal?.submittedByUserId ?? null
    }
    case "user": {
      // For follow notifications, the entityId is the user being followed
      return entityId
    }
    default: {
      return null
    }
  }
}

type MessageOwnerInfo = {
  ownerId: number
  parentEntityType: NotificationEntityType
  parentEntityId: number
}

/**
 * Get the owner and parent entity info for a message.
 * Used to create message_like notifications that reference the parent entity.
 */
export async function getMessageOwner(
  type: string,
  messageId: number,
): Promise<MessageOwnerInfo | null> {
  switch (type) {
    case "chatMessage": {
      const msg = await db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, messageId),
        columns: { userId: true },
      })
      return msg
        ? { ownerId: msg.userId, parentEntityType: "chat", parentEntityId: 0 }
        : null
    }
    case "postMessage": {
      const msg = await db.query.postMessages.findFirst({
        where: eq(postMessages.id, messageId),
        columns: { userId: true, postId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "post",
            parentEntityId: msg.postId,
          }
        : null
    }
    case "riuSetMessage": {
      const msg = await db.query.riuSetMessages.findFirst({
        where: eq(riuSetMessages.id, messageId),
        columns: { userId: true, riuSetId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "riuSet",
            parentEntityId: msg.riuSetId,
          }
        : null
    }
    case "riuSubmissionMessage": {
      const msg = await db.query.riuSubmissionMessages.findFirst({
        where: eq(riuSubmissionMessages.id, messageId),
        columns: { userId: true, riuSubmissionId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "riuSubmission",
            parentEntityId: msg.riuSubmissionId,
          }
        : null
    }
    case "utvVideoMessage": {
      const msg = await db.query.utvVideoMessages.findFirst({
        where: eq(utvVideoMessages.id, messageId),
        columns: { userId: true, utvVideoId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "utvVideo",
            parentEntityId: msg.utvVideoId,
          }
        : null
    }
    case "biuSetMessage": {
      const msg = await db.query.biuSetMessages.findFirst({
        where: eq(biuSetMessages.id, messageId),
        columns: { userId: true, biuSetId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "biuSet",
            parentEntityId: msg.biuSetId,
          }
        : null
    }
    case "siuSetMessage": {
      const msg = await db.query.siuSetMessages.findFirst({
        where: eq(siuSetMessages.id, messageId),
        columns: { userId: true, siuSetId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "siuSet",
            parentEntityId: msg.siuSetId,
          }
        : null
    }
    default: {
      return null
    }
  }
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
