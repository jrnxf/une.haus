import { type QueryKey } from "@tanstack/react-query"

import {
  type EngagementContentType,
  type EngagementMessageType,
  type MessageParentType,
} from "~/lib/engagement/registry.server"
import { games } from "~/lib/games"
import { posts } from "~/lib/posts"
import { utv } from "~/lib/utv/core"

/**
 * The client-safe projection of the engagement registry.
 *
 * `registry.server.ts` (ENTITY_REGISTRY) is server-only — it binds tables,
 * foreign-key columns, owner resolution, and notification types, none of which
 * can be bundled into the client. Client modules still need to know *which*
 * entity types are engageable, how to label them, and where their react-query
 * detail data lives. Historically each of those was a hand-maintained copy that
 * drifted from the registry in silence.
 *
 * This manifest is that projection. It imports only *types* from the server
 * registry (erased at bundle time), so the registry stays the single source of
 * truth; the `AssertEqual` guards below turn any drift into a compile error.
 * Runtime concerns that can't cross the seam (query keys) are derived from the
 * domain facades' `queryOptions` helpers so their keys can never drift either.
 */

// Tricks own `*_likes` / `*_messages` tables — the registry covers them so the
// schema-coverage test stays exhaustive — but they are not yet wired into the
// reactions dispatch or UI. They are the only registered types excluded from
// the client-facing engagement surface; adding another exclusion here is a
// deliberate, compile-checked decision.
type UnwiredContentType = "trick"
type UnwiredMessageType = "trickMessage"

/** Content entity types that are wired into the reactions dispatch/UI. */
export type LikeableContentType = Exclude<
  EngagementContentType,
  UnwiredContentType
>

/** Message entity types that are wired into the reactions dispatch/UI. */
export type LikeableMessageType = Exclude<
  EngagementMessageType,
  UnwiredMessageType
>

/** Every entity type a rider can like through the reactions module. */
export type LikeableType = LikeableContentType | LikeableMessageType

/**
 * Content entity types, in registry order. Locked to `LikeableContentType`
 * below, so a registered content type left out here is a compile error.
 */
export const contentTypes = [
  "post",
  "riuSet",
  "riuSubmission",
  "utvVideo",
  "biuSet",
  "siuSet",
] as const

/**
 * Message entity types, in registry order. Locked to `LikeableMessageType`
 * below, so a registered message type left out here is a compile error.
 */
export const messageTypes = [
  "chatMessage",
  "postMessage",
  "riuSetMessage",
  "riuSubmissionMessage",
  "utvVideoMessage",
  "biuSetMessage",
  "siuSetMessage",
] as const

/** Every likeable entity type — content types followed by message types. */
export const likeableTypes = [...contentTypes, ...messageTypes] as const

/**
 * Human-readable, lowercase labels for toast copy. Keyed by every likeable
 * type, so a missing label is a compile error. Every message type reads
 * "message" — the earlier copy carried raw type strings like "riuSetMessage".
 */
export const labels: Record<LikeableType, string> = {
  post: "post",
  riuSet: "set",
  riuSubmission: "submission",
  utvVideo: "video",
  biuSet: "set",
  siuSet: "set",
  chatMessage: "message",
  postMessage: "message",
  riuSetMessage: "message",
  riuSubmissionMessage: "message",
  utvVideoMessage: "message",
  biuSetMessage: "message",
  siuSetMessage: "message",
}

const contentTypeSet: ReadonlySet<string> = new Set(contentTypes)
const messageTypeSet: ReadonlySet<string> = new Set(messageTypes)

/** Narrowing guard: is this likeable type a content type? */
export function isLikeableContentType(
  type: LikeableType,
): type is LikeableContentType {
  return contentTypeSet.has(type)
}

/** Narrowing guard: is this likeable type a message type? */
export function isMessageType(type: LikeableType): type is LikeableMessageType {
  return messageTypeSet.has(type)
}

/**
 * The react-query key for a content entity's detail query. Derived straight
 * from each domain facade's `queryOptions` helper, so the key can't drift from
 * the query that owns the data. Message types have no standalone detail query
 * (they live inside a parent's message list, keyed by the parent), so this
 * covers content types only.
 */
export function queryKeyFor(type: LikeableContentType, id: number): QueryKey {
  switch (type) {
    case "post":
      return posts.get.queryOptions({ postId: id }).queryKey
    case "riuSet":
      return games.rius.sets.get.queryOptions({ setId: id }).queryKey
    case "riuSubmission":
      return games.rius.submissions.get.queryOptions({ submissionId: id })
        .queryKey
    case "biuSet":
      return games.bius.sets.get.queryOptions({ setId: id }).queryKey
    case "siuSet":
      return games.sius.sets.get.queryOptions({ setId: id }).queryKey
    case "utvVideo":
      return utv.get.queryOptions(id).queryKey
  }
}

/**
 * The message type paired with a message parent type — the type-safe form of
 * the old `` `${parent.type}Message` `` string concatenation. The return type
 * is the actual `LikeableMessageType` member, so an unregistered pairing is a
 * compile error rather than a runtime server-invariant failure.
 */
const messageTypeByParent = {
  chat: "chatMessage",
  post: "postMessage",
  riuSet: "riuSetMessage",
  riuSubmission: "riuSubmissionMessage",
  utvVideo: "utvVideoMessage",
  biuSet: "biuSetMessage",
  siuSet: "siuSetMessage",
} as const satisfies Record<MessageParentType, LikeableMessageType>

export function messageTypeFor<T extends MessageParentType>(
  parentType: T,
): (typeof messageTypeByParent)[T] {
  return messageTypeByParent[parentType]
}

/**
 * Compile-time drift guards. Each array's element union must equal the
 * registry-derived union it projects. If a content or message type is added to
 * (or removed from) `ENTITY_REGISTRY` without the matching change here — or the
 * unwired exclusions above go stale — one of these assignments fails to
 * type-check. Types can cross the client/server seam; values can't, which is
 * why the arrays are hand-listed but locked.
 */
type AssertEqual<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never

const _contentTypesLock: AssertEqual<
  (typeof contentTypes)[number],
  LikeableContentType
> = true
void _contentTypesLock

const _messageTypesLock: AssertEqual<
  (typeof messageTypes)[number],
  LikeableMessageType
> = true
void _messageTypesLock
