import { eq } from "drizzle-orm";

import { db } from "~/db";
import {
  notifications,
  userFollows,
  userNotificationSettings,
  type NotificationEntityType,
  type NotificationType,
} from "~/db/schema";
import type { CreateNotificationInput } from "~/lib/notifications/schemas";

/**
 * Creates a single notification.
 * Checks that actor !== recipient to avoid self-notifications.
 * Respects user notification preferences.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  // Don't notify yourself
  if (input.actorId && input.actorId === input.userId) {
    return;
  }

  // Check user preferences
  const settings = await db.query.userNotificationSettings.findFirst({
    where: eq(userNotificationSettings.userId, input.userId),
  });

  // If settings exist, check if this notification type is enabled
  // Note: archive_request and chain_archived bypass preference checks as they are important admin/system notifications
  if (settings && input.type !== "archive_request" && input.type !== "chain_archived") {
    const typeToSetting: Partial<Record<NotificationType, keyof typeof settings>> = {
      like: "likesEnabled",
      comment: "commentsEnabled",
      follow: "followsEnabled",
      new_content: "newContentEnabled",
    };

    const settingKey = typeToSetting[input.type];
    if (settingKey && !settings[settingKey]) {
      return; // User has disabled this notification type
    }
  }

  await db.insert(notifications).values({
    userId: input.userId,
    actorId: input.actorId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    data: input.data,
  });
}

/**
 * Creates notifications for all followers of a user.
 * Used when a followed user creates new content.
 */
export async function notifyFollowers(args: {
  actorId: number;
  actorName: string;
  actorAvatarId?: string | null;
  type: "new_content";
  entityType: NotificationEntityType;
  entityId: number;
  entityTitle?: string;
}): Promise<void> {
  // Get all followers of this user
  const followers = await db
    .select({ followedByUserId: userFollows.followedByUserId })
    .from(userFollows)
    .where(eq(userFollows.followedUserId, args.actorId));

  if (followers.length === 0) return;

  // Get notification settings for all followers to filter
  const followerIds = followers.map((f) => f.followedByUserId);

  // Get settings for followers who have disabled new_content
  const disabledSettings = await db.query.userNotificationSettings.findMany({
    where: (settings, { and, inArray, eq: eqOp }) =>
      and(
        inArray(settings.userId, followerIds),
        eqOp(settings.newContentEnabled, false),
      ),
    columns: { userId: true },
  });

  const disabledUserIds = new Set(disabledSettings.map((s) => s.userId));

  // Filter out users who have disabled new_content notifications
  const enabledFollowers = followers.filter(
    (f) => !disabledUserIds.has(f.followedByUserId),
  );

  if (enabledFollowers.length === 0) return;

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
  );
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
      });
      return post?.userId ?? null;
    }
    case "riuSet": {
      const set = await db.query.riuSets.findFirst({
        where: (sets, { eq: eqOp }) => eqOp(sets.id, entityId),
        columns: { userId: true },
      });
      return set?.userId ?? null;
    }
    case "riuSubmission": {
      const sub = await db.query.riuSubmissions.findFirst({
        where: (subs, { eq: eqOp }) => eqOp(subs.id, entityId),
        columns: { userId: true },
      });
      return sub?.userId ?? null;
    }
    case "biuSet": {
      const set = await db.query.biuSets.findFirst({
        where: (sets, { eq: eqOp }) => eqOp(sets.id, entityId),
        columns: { userId: true },
      });
      return set?.userId ?? null;
    }
    case "siuStack": {
      const stack = await db.query.siuStacks.findFirst({
        where: (stacks, { eq: eqOp }) => eqOp(stacks.id, entityId),
        columns: { userId: true },
      });
      return stack?.userId ?? null;
    }
    case "siuChain": {
      // SIU chains don't have a single owner
      return null;
    }
    case "utvVideo": {
      // UTV videos don't have owners (legacy content)
      return null;
    }
    case "user": {
      // For follow notifications, the entityId is the user being followed
      return entityId;
    }
    default:
      return null;
  }
}
