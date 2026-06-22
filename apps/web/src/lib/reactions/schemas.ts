import { z } from "zod"

import { type EngagementEntityType } from "~/lib/engagement/registry.server"

/**
 * The engageable entity types that can be liked through the reactions module.
 *
 * Constrained to registry keys via `satisfies readonly EngagementEntityType[]`
 * so this union cannot drift from the registry — the registry remains the single
 * source of truth for each type's likes table, foreign-key column, owner
 * resolution, and notification type.
 *
 * Tricks own `*_likes` tables (so the registry covers them for schema coverage),
 * but they are not yet wired into the reactions dispatch/UI, so `trick` and
 * `trickMessage` are intentionally absent here.
 */
export const recordTypeWithLikes = [
  "chatMessage",
  "post",
  "postMessage",
  "riuSet",
  "riuSetMessage",
  "riuSubmission",
  "riuSubmissionMessage",
  "utvVideo",
  "utvVideoMessage",
  "biuSet",
  "biuSetMessage",
  "siuSet",
  "siuSetMessage",
] as const satisfies readonly EngagementEntityType[]

export const recordTypeToLabel: Record<RecordWithLikesType, string> = {
  post: "post",
  postMessage: "message",
  chatMessage: "message",
  riuSet: "set",
  riuSetMessage: "riuSetMessage",
  riuSubmission: "submission",
  riuSubmissionMessage: "submissionMessage",
  utvVideo: "video",
  utvVideoMessage: "message",
  biuSet: "set",
  biuSetMessage: "biuSetMessage",
  siuSet: "set",
  siuSetMessage: "siuSetMessage",
}

const baseSchema = z.object({
  recordId: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordTypeWithLikes),
})

export const likeRecordSchema = baseSchema
export const unlikeRecordSchema = baseSchema

export type RecordWithLikes = z.infer<typeof baseSchema>

export type RecordWithLikesType = RecordWithLikes["type"]
