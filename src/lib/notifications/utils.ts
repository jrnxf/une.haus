import type { NotificationEntityType, NotificationType } from "~/db/schema";

/**
 * Get the URL to navigate to when clicking a notification
 */
export function getNotificationUrl(
  entityType: NotificationEntityType,
  entityId: number,
): string {
  switch (entityType) {
    case "post": {
      return `/posts/${entityId}`;
    }
    case "riuSet": {
      return `/games/rius/sets/${entityId}`;
    }
    case "riuSubmission": {
      return `/games/rius/submissions/${entityId}`;
    }
    case "biuSet": {
      return `/games/bius/sets/${entityId}`;
    }
    case "utvVideo": {
      return `/vault/${entityId}`;
    }
    case "user": {
      return `/users/${entityId}`;
    }
    default: {
      return "/";
    }
  }
}

/**
 * Get a human-readable message for a notification
 */
export function getNotificationMessage(
  type: NotificationType,
  entityType: NotificationEntityType,
  count: number,
  actorNames: string[],
  entityTitle?: string,
): string {
  const actorText = formatActors(actorNames, count);

  switch (type) {
    case "like": {
      return `${actorText} liked your ${formatEntityType(entityType)}${entityTitle ? `: "${entityTitle}"` : ""}`;
    }
    case "comment": {
      return `${actorText} commented on your ${formatEntityType(entityType)}${entityTitle ? `: "${entityTitle}"` : ""}`;
    }
    case "follow": {
      return `${actorText} started following you`;
    }
    case "new_content": {
      return `${actorText} ${count > 1 ? "created new content" : `posted ${formatEntityType(entityType)}`}${entityTitle ? `: "${entityTitle}"` : ""}`;
    }
    default: {
      return "You have a new notification";
    }
  }
}

function formatActors(names: string[], totalCount: number): string {
  if (names.length === 0) return "Someone";
  if (names.length === 1) {
    if (totalCount > 1) {
      return `${names[0]} and ${totalCount - 1} ${totalCount - 1 === 1 ? "other" : "others"}`;
    }
    return names[0];
  }
  if (names.length === 2) {
    if (totalCount > 2) {
      return `${names[0]}, ${names[1]} and ${totalCount - 2} ${totalCount - 2 === 1 ? "other" : "others"}`;
    }
    return `${names[0]} and ${names[1]}`;
  }
  // 3+ names
  if (totalCount > names.length) {
    return `${names[0]}, ${names[1]} and ${totalCount - 2} others`;
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function formatEntityType(entityType: NotificationEntityType): string {
  switch (entityType) {
    case "post": {
      return "post";
    }
    case "riuSet": {
      return "RIU set";
    }
    case "riuSubmission": {
      return "RIU submission";
    }
    case "biuSet": {
      return "BIU set";
    }
    case "utvVideo": {
      return "video";
    }
    case "user": {
      return "profile";
    }
    default: {
      return "content";
    }
  }
}
