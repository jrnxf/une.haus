import { z } from "zod"

import { type LikeableType, likeableTypes } from "~/lib/engagement/manifest"

/**
 * The engageable entity types that can be liked through the reactions module.
 *
 * Re-exported from the engagement manifest, which projects the server-only
 * registry and locks the union to it at compile time. The manifest remains the
 * single source of truth for each type's label and detail query key; the
 * registry owns the likes table, foreign-key column, owner resolution, and
 * notification type.
 */
export const recordTypeWithLikes = likeableTypes

const baseSchema = z.object({
  recordId: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordTypeWithLikes),
})

export const likeRecordSchema = baseSchema
export const unlikeRecordSchema = baseSchema

export type RecordWithLikes = z.infer<typeof baseSchema>

export type RecordWithLikesType = LikeableType
