import { z } from "zod"

import { TRICK_SUBMISSION_STATUSES, USER_DISCIPLINES } from "~/db/schema"

const commaArrayOf = <T extends string>(enumValues: readonly [T, ...T[]]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined
      const arr = typeof val === "string" ? val.split(",").filter(Boolean) : val
      const parsed = z.array(z.enum(enumValues)).safeParse(arr)
      return parsed.success ? parsed.data : undefined
    })

const commaArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((val) => {
    if (!val) return undefined
    const arr = typeof val === "string" ? val.split(",").filter(Boolean) : val
    return arr.length > 0 ? arr : undefined
  })

export const listUtvVideosSchema = z.object({
  cursor: z.number().nullish(),
  q: z.string().optional(),
  disciplines: commaArrayOf(USER_DISCIPLINES),
  riders: commaArray,
})

// Suggestion schemas
export const utvVideoSuggestionDiffSchema = z.object({
  title: z.string().optional(),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).nullable().optional(),
  riders: z
    .array(
      z.object({
        userId: z.number().nullable(),
        name: z.string().nullable(),
      }),
    )
    .optional(),
})

export type UtvVideoSuggestionDiffInput = z.infer<
  typeof utvVideoSuggestionDiffSchema
>

export const createUtvSuggestionSchema = z.object({
  utvVideoId: z.number(),
  diff: utvVideoSuggestionDiffSchema,
  reason: z.string().optional().nullable(),
})

export type CreateUtvSuggestionArgs = z.infer<typeof createUtvSuggestionSchema>

export const getUtvSuggestionSchema = z.object({
  id: z.number(),
})

export const listUtvSuggestionsSchema = z
  .object({
    status: z.enum(TRICK_SUBMISSION_STATUSES).optional(),
    utvVideoId: z.number().optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional()

export type ListUtvSuggestionsArgs = z.infer<typeof listUtvSuggestionsSchema>
export type ListUtvSuggestionsInput = z.input<typeof listUtvSuggestionsSchema>

export const reviewUtvSuggestionSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().min(1),
})

export type ReviewUtvSuggestionArgs = z.infer<typeof reviewUtvSuggestionSchema>
