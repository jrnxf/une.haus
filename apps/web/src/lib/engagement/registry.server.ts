import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import { type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core"

import { db } from "~/db"
import {
  biuSetLikes,
  biuSetMessageLikes,
  biuSetMessages,
  biuSets,
  chatMessageLikes,
  chatMessages,
  type NotificationEntityType,
  type NotificationType,
  postLikes,
  postMessageLikes,
  postMessages,
  posts,
  riuSetLikes,
  riuSetMessageLikes,
  riuSetMessages,
  riuSets,
  riuSubmissionLikes,
  riuSubmissionMessageLikes,
  riuSubmissionMessages,
  riuSubmissions,
  siuSetLikes,
  siuSetMessageLikes,
  siuSetMessages,
  siuSets,
  trickLikes,
  trickMessageLikes,
  trickMessages,
  tricks,
  utvVideoLikes,
  utvVideoMessageLikes,
  utvVideoMessages,
} from "~/db/schema"

/**
 * EntityRegistry — the single source of truth for the engagement binding of
 * every engageable entity type.
 *
 * Riders engage with most entities the same two ways — **like** and **message**
 * — and a notification must reach the right person. Historically the knowledge
 * of "which entities exist and how each binds to its likes table, foreign-key
 * column, message table, owner, and notification type" was hand-copied across
 * several `switch`/union sites; missing an entry didn't error, it silently
 * no-oped (see CLAUDE.md on the dynamic `${type}Id` hazard).
 *
 * Owner-resolution now lives here. Each binding knows how to read the user a
 * notification must reach: the **content owner** for a like or message on a
 * content entity, and the **message author** for a like on a message. The
 * notifications module reads from this registry instead of re-deriving the same
 * mapping in a parallel `switch`.
 */

/**
 * Where a notification about a *message like* points. Message likes notify the
 * message author but reference the *parent* content entity so the recipient can
 * navigate to the thread.
 */
export type MessageTarget = {
  /** The message author — the user to notify. */
  ownerId: number
  /** The parent content entity the message hangs off of. */
  parentEntityType: NotificationEntityType
  /** The parent content entity's id. */
  parentEntityId: number
}

type ContentBinding = {
  kind: "content"
  /** The `{entity}Likes` table holding like rows. */
  likesTable: PgTable
  /**
   * The foreign-key column on `likesTable` pointing at the liked record. Stored
   * as the actual Drizzle column reference — never reconstructed at runtime from
   * `` `${type}Id` `` (the documented silent-failure source).
   */
  fkColumn: AnyPgColumn
  /** The `{entity}Messages` table of messages attached to this content. */
  messageTable: PgTable
  /** Resolves the content owner to notify, or null when none (e.g. legacy). */
  resolveOwner: (recordId: number) => Promise<number | null>
  /** Notification type emitted when this content is liked. */
  notificationType: NotificationType
}

type MessageBinding = {
  kind: "message"
  /** The `{entity}Likes` table holding like rows. */
  likesTable: PgTable
  /** The foreign-key column on `likesTable` pointing at the liked message. */
  fkColumn: AnyPgColumn
  /** The `{entity}Messages` table the message rows live in. */
  messageTable: PgTable
  /** Resolves the message author to notify, or null when the message is gone. */
  resolveOwner: (recordId: number) => Promise<number | null>
  /**
   * Resolves the full notification target for a like on this message: author
   * plus the parent content entity to reference. Null when the message is gone
   * or its parent isn't a notifiable entity type.
   */
  resolveMessageTarget: (recordId: number) => Promise<MessageTarget | null>
  /** Notification type emitted when this message is liked. */
  notificationType: NotificationType
}

export type EngagementBinding = ContentBinding | MessageBinding

/**
 * Every engageable entity type. The `satisfies Record<…>` on the registry forces
 * each member to have a row; the schema-coverage test forces this list to stay
 * complete versus the database catalog.
 */
const ENGAGEMENT_ENTITY_TYPES = [
  // content (likeable + messageable)
  "post",
  "riuSet",
  "riuSubmission",
  "biuSet",
  "siuSet",
  "utvVideo",
  "trick",
  // message (likeable only)
  "chatMessage",
  "postMessage",
  "riuSetMessage",
  "riuSubmissionMessage",
  "utvVideoMessage",
  "biuSetMessage",
  "siuSetMessage",
  "trickMessage",
] as const

export type EngagementEntityType = (typeof ENGAGEMENT_ENTITY_TYPES)[number]

/** The subset of engagement entity types whose binding kind is `content`. */
export type EngagementContentType =
  | "post"
  | "riuSet"
  | "riuSubmission"
  | "biuSet"
  | "siuSet"
  | "utvVideo"
  | "trick"

/** The subset of engagement entity types whose binding kind is `message`. */
export type EngagementMessageType = Exclude<
  EngagementEntityType,
  EngagementContentType
>

/**
 * Resolve a record's owner by reading its `userId` column. `query` is the
 * Drizzle relational-query object for the table (e.g. `db.query.posts`); it is
 * invoked as a method so `this` stays bound.
 */
type UserIdQuery = {
  findFirst: (args: {
    where: ReturnType<typeof eq>
    columns: { userId: true }
  }) => Promise<{ userId: number } | undefined>
}

const ownerByUserId =
  (query: UserIdQuery, idColumn: AnyPgColumn) =>
  async (recordId: number): Promise<number | null> => {
    const row = await query.findFirst({
      where: eq(idColumn, recordId),
      columns: { userId: true },
    })
    return row?.userId ?? null
  }

export const ENTITY_REGISTRY = {
  // --- content ---
  post: {
    kind: "content",
    likesTable: postLikes,
    fkColumn: postLikes.postId,
    messageTable: postMessages,
    resolveOwner: ownerByUserId(db.query.posts, posts.id),
    notificationType: "like",
  },
  riuSet: {
    kind: "content",
    likesTable: riuSetLikes,
    fkColumn: riuSetLikes.riuSetId,
    messageTable: riuSetMessages,
    resolveOwner: ownerByUserId(db.query.riuSets, riuSets.id),
    notificationType: "like",
  },
  riuSubmission: {
    kind: "content",
    likesTable: riuSubmissionLikes,
    fkColumn: riuSubmissionLikes.riuSubmissionId,
    messageTable: riuSubmissionMessages,
    // a submission notifies its submitter — the rider who uploaded it.
    resolveOwner: ownerByUserId(db.query.riuSubmissions, riuSubmissions.id),
    notificationType: "like",
  },
  biuSet: {
    kind: "content",
    likesTable: biuSetLikes,
    fkColumn: biuSetLikes.biuSetId,
    messageTable: biuSetMessages,
    resolveOwner: ownerByUserId(db.query.biuSets, biuSets.id),
    notificationType: "like",
  },
  siuSet: {
    kind: "content",
    likesTable: siuSetLikes,
    fkColumn: siuSetLikes.siuSetId,
    messageTable: siuSetMessages,
    resolveOwner: ownerByUserId(db.query.siuSets, siuSets.id),
    notificationType: "like",
  },
  utvVideo: {
    kind: "content",
    likesTable: utvVideoLikes,
    fkColumn: utvVideoLikes.utvVideoId,
    messageTable: utvVideoMessages,
    // vault videos are legacy imports with no owner — nobody to notify.
    resolveOwner: async () => null,
    notificationType: "like",
  },
  trick: {
    kind: "content",
    likesTable: trickLikes,
    fkColumn: trickLikes.trickId,
    messageTable: trickMessages,
    // tricks are not yet wired into the engagement dispatch; the closest owner
    // is the rider credited with inventing it.
    resolveOwner: async (recordId) => {
      const trick = await db.query.tricks.findFirst({
        where: eq(tricks.id, recordId),
        columns: { inventedByUserId: true },
      })
      return trick?.inventedByUserId ?? null
    },
    notificationType: "like",
  },

  // --- message ---
  chatMessage: {
    kind: "message",
    likesTable: chatMessageLikes,
    fkColumn: chatMessageLikes.chatMessageId,
    messageTable: chatMessages,
    resolveOwner: ownerByUserId(db.query.chatMessages, chatMessages.id),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.chatMessages.findFirst({
        where: eq(chatMessages.id, recordId),
        columns: { userId: true },
      })
      return msg
        ? { ownerId: msg.userId, parentEntityType: "chat", parentEntityId: 0 }
        : null
    },
    notificationType: "message_like",
  },
  postMessage: {
    kind: "message",
    likesTable: postMessageLikes,
    fkColumn: postMessageLikes.postMessageId,
    messageTable: postMessages,
    resolveOwner: ownerByUserId(db.query.postMessages, postMessages.id),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.postMessages.findFirst({
        where: eq(postMessages.id, recordId),
        columns: { userId: true, postId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "post",
            parentEntityId: msg.postId,
          }
        : null
    },
    notificationType: "message_like",
  },
  riuSetMessage: {
    kind: "message",
    likesTable: riuSetMessageLikes,
    fkColumn: riuSetMessageLikes.riuSetMessageId,
    messageTable: riuSetMessages,
    resolveOwner: ownerByUserId(db.query.riuSetMessages, riuSetMessages.id),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.riuSetMessages.findFirst({
        where: eq(riuSetMessages.id, recordId),
        columns: { userId: true, riuSetId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "riuSet",
            parentEntityId: msg.riuSetId,
          }
        : null
    },
    notificationType: "message_like",
  },
  riuSubmissionMessage: {
    kind: "message",
    likesTable: riuSubmissionMessageLikes,
    fkColumn: riuSubmissionMessageLikes.riuSubmissionMessageId,
    messageTable: riuSubmissionMessages,
    resolveOwner: ownerByUserId(
      db.query.riuSubmissionMessages,
      riuSubmissionMessages.id,
    ),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.riuSubmissionMessages.findFirst({
        where: eq(riuSubmissionMessages.id, recordId),
        columns: { userId: true, riuSubmissionId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "riuSubmission",
            parentEntityId: msg.riuSubmissionId,
          }
        : null
    },
    notificationType: "message_like",
  },
  utvVideoMessage: {
    kind: "message",
    likesTable: utvVideoMessageLikes,
    fkColumn: utvVideoMessageLikes.utvVideoMessageId,
    messageTable: utvVideoMessages,
    resolveOwner: ownerByUserId(db.query.utvVideoMessages, utvVideoMessages.id),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.utvVideoMessages.findFirst({
        where: eq(utvVideoMessages.id, recordId),
        columns: { userId: true, utvVideoId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "utvVideo",
            parentEntityId: msg.utvVideoId,
          }
        : null
    },
    notificationType: "message_like",
  },
  biuSetMessage: {
    kind: "message",
    likesTable: biuSetMessageLikes,
    fkColumn: biuSetMessageLikes.biuSetMessageId,
    messageTable: biuSetMessages,
    resolveOwner: ownerByUserId(db.query.biuSetMessages, biuSetMessages.id),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.biuSetMessages.findFirst({
        where: eq(biuSetMessages.id, recordId),
        columns: { userId: true, biuSetId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "biuSet",
            parentEntityId: msg.biuSetId,
          }
        : null
    },
    notificationType: "message_like",
  },
  siuSetMessage: {
    kind: "message",
    likesTable: siuSetMessageLikes,
    fkColumn: siuSetMessageLikes.siuSetMessageId,
    messageTable: siuSetMessages,
    resolveOwner: ownerByUserId(db.query.siuSetMessages, siuSetMessages.id),
    resolveMessageTarget: async (recordId) => {
      const msg = await db.query.siuSetMessages.findFirst({
        where: eq(siuSetMessages.id, recordId),
        columns: { userId: true, siuSetId: true },
      })
      return msg
        ? {
            ownerId: msg.userId,
            parentEntityType: "siuSet",
            parentEntityId: msg.siuSetId,
          }
        : null
    },
    notificationType: "message_like",
  },
  trickMessage: {
    kind: "message",
    likesTable: trickMessageLikes,
    fkColumn: trickMessageLikes.trickMessageId,
    messageTable: trickMessages,
    resolveOwner: ownerByUserId(db.query.trickMessages, trickMessages.id),
    // tricks are not a notifiable parent entity type yet, so a like on a trick
    // message has no target to route to — preserves the prior null behavior.
    resolveMessageTarget: async () => null,
    notificationType: "message_like",
  },
} satisfies Record<EngagementEntityType, EngagementBinding>

/** Narrowing type guard: is `type` a registered engagement content type? */
export function isEngagementContentType(
  type: string,
): type is EngagementContentType {
  return (
    type in ENTITY_REGISTRY &&
    ENTITY_REGISTRY[type as EngagementEntityType].kind === "content"
  )
}

/** Narrowing type guard: is `type` a registered engagement message type? */
export function isEngagementMessageType(
  type: string,
): type is EngagementMessageType {
  return (
    type in ENTITY_REGISTRY &&
    ENTITY_REGISTRY[type as EngagementEntityType].kind === "message"
  )
}

/**
 * Resolve the content owner to notify for a like or message on a content entity.
 * Returns null when the entity is gone or has no owner (e.g. legacy vault
 * videos). Reads straight from the registry — no parallel `switch`.
 */
export async function resolveContentOwner(
  type: EngagementContentType,
  recordId: number,
): Promise<number | null> {
  return ENTITY_REGISTRY[type].resolveOwner(recordId)
}

/**
 * Resolve the notification target for a like on a message: the message author
 * plus the parent content entity to reference. Returns null when the message is
 * gone. Reads straight from the registry — no parallel `switch`.
 */
export async function resolveMessageTarget(
  type: EngagementMessageType,
  recordId: number,
): Promise<MessageTarget | null> {
  return ENTITY_REGISTRY[type].resolveMessageTarget(recordId)
}
