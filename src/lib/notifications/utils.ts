import pluralize from "pluralize"

import {
  type NotificationData,
  type NotificationEntityType,
  type NotificationType,
} from "~/db/schema"

/**
 * Get the URL to navigate to when clicking a notification
 */
export function getNotificationUrl(
  entityType: NotificationEntityType,
  entityId: number,
  data?: NotificationData | null,
): string {
  let url: string
  switch (entityType) {
    case "chat": {
      url = "/chat"
      break
    }
    case "post": {
      url = `/posts/${entityId}`
      break
    }
    case "riuSet": {
      url = `/games/rius/sets/${entityId}`
      break
    }
    case "riuSubmission": {
      url = `/games/rius/submissions/${entityId}`
      break
    }
    case "biuSet": {
      url = `/games/bius/sets/${entityId}`
      break
    }
    case "siuSet": {
      url = `/games/sius/sets/${entityId}`
      break
    }
    case "siu": {
      url = "/games/sius"
      break
    }
    case "utvVideo": {
      url = `/vault/${entityId}`
      break
    }
    case "user": {
      url = `/users/${entityId}`
      break
    }
    case "trickSubmission":
    case "trickSuggestion":
    case "trickVideo": {
      url = data?.trickSlug ? `/tricks/${data.trickSlug}` : "/tricks"
      break
    }
    case "glossaryProposal": {
      url = "/tricks/glossary"
      break
    }
    case "utvVideoSuggestion": {
      url = "/vault"
      break
    }
    default: {
      url = "/"
    }
  }

  if (data?.messageId) {
    url += `#message-${data.messageId}`
  }

  return url
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
  const actorText = formatActors(actorNames, count)

  switch (type) {
    case "like": {
      return `${actorText} liked your ${formatEntityType(entityType)}${entityTitle ? `: "${entityTitle}"` : ""}`
    }
    case "comment": {
      return `${actorText} commented on your ${formatEntityType(entityType)}${entityTitle ? `: "${entityTitle}"` : ""}`
    }
    case "follow": {
      return `${actorText} started following you`
    }
    case "new_content": {
      return `${actorText} ${count > 1 ? "created new content" : `posted ${formatEntityType(entityType)}`}${entityTitle ? `: "${entityTitle}"` : ""}`
    }
    case "review": {
      // entityTitle contains "approved" or "rejected"
      return `${actorText} ${entityTitle} your ${formatEntityType(entityType)}`
    }
    case "flag": {
      return `${actorText} flagged ${formatEntityType(entityType)}${entityTitle ? `: "${entityTitle}"` : ""}`
    }
    case "mention": {
      return `${actorText} mentioned you in a ${formatEntityType(entityType)}${entityTitle ? `: "${entityTitle}"` : ""}`
    }
    default: {
      return "You have a new notification"
    }
  }
}

/**
 * Get just the action text for a notification (without actor names)
 */
export function getNotificationAction(
  type: NotificationType,
  entityType: NotificationEntityType,
  entityTitle?: string,
): string {
  switch (type) {
    case "like": {
      return `liked your ${formatEntityType(entityType)}${entityTitle ? ` "${entityTitle}"` : ""}`
    }
    case "comment": {
      return `commented on your ${formatEntityType(entityType)}${entityTitle ? ` "${entityTitle}"` : ""}`
    }
    case "follow": {
      return "started following you"
    }
    case "new_content": {
      return `posted ${formatEntityType(entityType)}${entityTitle ? ` "${entityTitle}"` : ""}`
    }
    case "review": {
      // entityTitle contains "approved" or "rejected"
      return `${entityTitle} your ${formatEntityType(entityType)}`
    }
    case "flag": {
      return `flagged ${formatEntityType(entityType)}${entityTitle ? ` "${entityTitle}"` : ""}`
    }
    case "mention": {
      return `mentioned you in a ${formatEntityType(entityType)}${entityTitle ? ` "${entityTitle}"` : ""}`
    }
    default: {
      return "sent you a notification"
    }
  }
}

function formatActors(names: string[], totalCount: number): string {
  if (names.length === 0) return "Someone"
  if (names.length === 1) {
    if (totalCount > 1) {
      return `${names[0]} and ${totalCount - 1} ${pluralize("other", totalCount - 1)}`
    }
    return names[0]
  }
  if (names.length === 2) {
    if (totalCount > 2) {
      return `${names[0]}, ${names[1]} and ${totalCount - 2} ${pluralize("other", totalCount - 2)}`
    }
    return `${names[0]} and ${names[1]}`
  }
  // 3+ names
  if (totalCount > names.length) {
    return `${names[0]}, ${names[1]} and ${totalCount - 2} others`
  }
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

function formatEntityType(entityType: NotificationEntityType): string {
  switch (entityType) {
    case "chat": {
      return "chat"
    }
    case "post": {
      return "post"
    }
    case "riuSet": {
      return "RIU set"
    }
    case "riuSubmission": {
      return "RIU submission"
    }
    case "biuSet": {
      return "BIU set"
    }
    case "siuSet": {
      return "SIU set"
    }
    case "siu": {
      return "SIU round"
    }
    case "utvVideo": {
      return "video"
    }
    case "user": {
      return "profile"
    }
    case "trickSubmission": {
      return "trick submission"
    }
    case "trickSuggestion": {
      return "trick suggestion"
    }
    case "trickVideo": {
      return "trick video"
    }
    case "glossaryProposal": {
      return "glossary proposal"
    }
    case "utvVideoSuggestion": {
      return "video suggestion"
    }
    default: {
      return "content"
    }
  }
}
