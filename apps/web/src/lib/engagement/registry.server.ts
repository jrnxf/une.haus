import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import { type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core"

import { db } from "~/db"
import {
  biuSetLikes,
  biuSetMessageLikes,
  biuSetMessages,
  chatMessageLikes,
  chatMessages,
  type NotificationType,
  postLikes,
  postMessageLikes,
  postMessages,
  riuSetLikes,
  riuSetMessageLikes,
  riuSetMessages,
  riuSubmissionLikes,
  riuSubmissionMessageLikes,
  riuSubmissionMessages,
  siuSetLikes,
  siuSetMessageLikes,
  siuSetMessages,
  trickLikes,
  trickMessageLikes,
  trickMessages,
  tricks,
  utvVideoLikes,
  utvVideoMessageLikes,
  utvVideoMessages,
} from "~/db/schema"
import {
  getContentOwner,
  getMessageOwner,
} from "~/lib/notifications/helpers.server"

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
 * This module consolidates that map. Slice 1 only *introduces* the registry —
 * no consumers are rewired yet, so behavior is unchanged. Later slices rewrite
 * the scattered dispatch sites to read from here.
 */

/**
 * Capability axis for an entity type.
 * - `content`: likeable *and* messageable; a like notifies the content owner.
 * - `message`: likeable only; a like notifies the message author.
 */
type EngagementKind = "content" | "message"

export type EngagementBinding = {
  /** Capability axis — drives how a like is routed. */
  kind: EngagementKind
  /** The `{entity}Likes` table holding like rows. */
  likesTable: PgTable
  /**
   * The foreign-key column on `likesTable` pointing at the liked record. Stored
   * as the actual Drizzle column reference — never reconstructed at runtime from
   * `` `${type}Id` `` (the documented silent-failure source).
   */
  fkColumn: AnyPgColumn
  /**
   * For `content`: the `{entity}Messages` table of messages attached to it.
   * For `message`: the `{entity}Messages` table the message rows live in.
   * Always present so every `*_messages` table is owned by the registry.
   */
  messageTable: PgTable
  /** Resolves the user to notify (content owner / message author), or null. */
  resolveOwner: (recordId: number) => Promise<number | null>
  /** Notification type emitted when this entity is liked. */
  notificationType: NotificationType
}

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

/** Resolve the owner of a message via the existing notifications helper. */
const messageAuthor =
  (type: string) =>
  async (recordId: number): Promise<number | null> =>
    (await getMessageOwner(type, recordId))?.ownerId ?? null

export const ENTITY_REGISTRY = {
  // --- content ---
  post: {
    kind: "content",
    likesTable: postLikes,
    fkColumn: postLikes.postId,
    messageTable: postMessages,
    resolveOwner: (recordId) => getContentOwner("post", recordId),
    notificationType: "like",
  },
  riuSet: {
    kind: "content",
    likesTable: riuSetLikes,
    fkColumn: riuSetLikes.riuSetId,
    messageTable: riuSetMessages,
    resolveOwner: (recordId) => getContentOwner("riuSet", recordId),
    notificationType: "like",
  },
  riuSubmission: {
    kind: "content",
    likesTable: riuSubmissionLikes,
    fkColumn: riuSubmissionLikes.riuSubmissionId,
    messageTable: riuSubmissionMessages,
    resolveOwner: (recordId) => getContentOwner("riuSubmission", recordId),
    notificationType: "like",
  },
  biuSet: {
    kind: "content",
    likesTable: biuSetLikes,
    fkColumn: biuSetLikes.biuSetId,
    messageTable: biuSetMessages,
    resolveOwner: (recordId) => getContentOwner("biuSet", recordId),
    notificationType: "like",
  },
  siuSet: {
    kind: "content",
    likesTable: siuSetLikes,
    fkColumn: siuSetLikes.siuSetId,
    messageTable: siuSetMessages,
    resolveOwner: (recordId) => getContentOwner("siuSet", recordId),
    notificationType: "like",
  },
  utvVideo: {
    kind: "content",
    likesTable: utvVideoLikes,
    fkColumn: utvVideoLikes.utvVideoId,
    messageTable: utvVideoMessages,
    // vault videos are legacy imports with no owner — getContentOwner returns null.
    resolveOwner: (recordId) => getContentOwner("utvVideo", recordId),
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
    resolveOwner: messageAuthor("chatMessage"),
    notificationType: "message_like",
  },
  postMessage: {
    kind: "message",
    likesTable: postMessageLikes,
    fkColumn: postMessageLikes.postMessageId,
    messageTable: postMessages,
    resolveOwner: messageAuthor("postMessage"),
    notificationType: "message_like",
  },
  riuSetMessage: {
    kind: "message",
    likesTable: riuSetMessageLikes,
    fkColumn: riuSetMessageLikes.riuSetMessageId,
    messageTable: riuSetMessages,
    resolveOwner: messageAuthor("riuSetMessage"),
    notificationType: "message_like",
  },
  riuSubmissionMessage: {
    kind: "message",
    likesTable: riuSubmissionMessageLikes,
    fkColumn: riuSubmissionMessageLikes.riuSubmissionMessageId,
    messageTable: riuSubmissionMessages,
    resolveOwner: messageAuthor("riuSubmissionMessage"),
    notificationType: "message_like",
  },
  utvVideoMessage: {
    kind: "message",
    likesTable: utvVideoMessageLikes,
    fkColumn: utvVideoMessageLikes.utvVideoMessageId,
    messageTable: utvVideoMessages,
    resolveOwner: messageAuthor("utvVideoMessage"),
    notificationType: "message_like",
  },
  biuSetMessage: {
    kind: "message",
    likesTable: biuSetMessageLikes,
    fkColumn: biuSetMessageLikes.biuSetMessageId,
    messageTable: biuSetMessages,
    resolveOwner: messageAuthor("biuSetMessage"),
    notificationType: "message_like",
  },
  siuSetMessage: {
    kind: "message",
    likesTable: siuSetMessageLikes,
    fkColumn: siuSetMessageLikes.siuSetMessageId,
    messageTable: siuSetMessages,
    resolveOwner: messageAuthor("siuSetMessage"),
    notificationType: "message_like",
  },
  trickMessage: {
    kind: "message",
    likesTable: trickMessageLikes,
    fkColumn: trickMessageLikes.trickMessageId,
    messageTable: trickMessages,
    // trickMessage is not handled by getMessageOwner yet; resolve directly.
    resolveOwner: async (recordId) => {
      const message = await db.query.trickMessages.findFirst({
        where: eq(trickMessages.id, recordId),
        columns: { userId: true },
      })
      return message?.userId ?? null
    },
    notificationType: "message_like",
  },
} satisfies Record<EngagementEntityType, EngagementBinding>
