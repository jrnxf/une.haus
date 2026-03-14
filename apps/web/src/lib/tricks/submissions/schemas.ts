import getYoutubeVideoId from "get-youtube-id"
import { z } from "zod"

import {
  TRICK_RELATIONSHIP_TYPES,
  TRICK_SUBMISSION_STATUSES,
} from "~/db/schema"

// Submission relationship schema
const submissionRelationshipSchema = z.object({
  targetTrickId: z.number(),
  type: z.enum(TRICK_RELATIONSHIP_TYPES),
})

// Create submission (user submits new trick for review)
export const createSubmissionSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  alternateNames: z.array(z.string()).default([]),
  description: z.string().optional().nullable(),
  inventedBy: z.string().optional().nullable(),
  inventedByUserId: z.number().optional().nullable(),
  yearLanded: z.number().int().min(1900).max(2100).optional().nullable(),
  videoUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val, ctx) => {
      if (!val) return val
      const youtubeId =
        getYoutubeVideoId(val) ?? (/^[\w-]{11}$/.test(val) ? val : null)
      if (!youtubeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid YouTube URL",
        })
        return z.NEVER
      }
      return `https://www.youtube.com/watch?v=${youtubeId}`
    }),
  videoTimestamp: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  relationships: z.array(submissionRelationshipSchema).default([]),
})

export type CreateSubmissionArgs = z.infer<typeof createSubmissionSchema>

export const getSubmissionSchema = z.object({
  id: z.number(),
})

export const listSubmissionsSchema = z
  .object({
    status: z.enum(TRICK_SUBMISSION_STATUSES).optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional()

export type ListSubmissionsInput = z.input<typeof listSubmissionsSchema>

// Review submission (admin approves/rejects)
export const reviewSubmissionSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().min(1),
})

export type ReviewSubmissionArgs = z.infer<typeof reviewSubmissionSchema>

// Suggestion schemas
const trickSuggestionDiffSchema = z.object({
  name: z.string().optional(),
  alternateNames: z.array(z.string()).optional(),
  description: z.string().nullable().optional(),
  inventedBy: z.string().nullable().optional(),
  yearLanded: z.number().int().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  videoTimestamp: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  elements: z.array(z.string()).optional(),
  relationships: z
    .object({
      added: z.array(
        z.object({
          targetSlug: z.string(),
          type: z.string(),
        }),
      ),
      removed: z.array(
        z.object({
          targetSlug: z.string(),
          type: z.string(),
        }),
      ),
    })
    .optional(),
})

export const createSuggestionSchema = z.object({
  trickId: z.number(),
  diff: trickSuggestionDiffSchema,
  reason: z.string().optional().nullable(),
})

export const getSuggestionSchema = z.object({
  id: z.number(),
})

export const listSuggestionsSchema = z
  .object({
    status: z.enum(TRICK_SUBMISSION_STATUSES).optional(),
    trickId: z.number().optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional()

export type ListSuggestionsInput = z.input<typeof listSuggestionsSchema>

export const reviewSuggestionSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().min(1),
})
