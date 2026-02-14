import getYoutubeVideoId from "get-youtube-id";
import { z } from "zod";

import {
  TRICK_RELATIONSHIP_TYPES,
  TRICK_SUBMISSION_STATUSES,
} from "~/db/schema";

// Submission relationship schema
export const submissionRelationshipSchema = z.object({
  targetTrickId: z.number(),
  type: z.enum(TRICK_RELATIONSHIP_TYPES),
});

// Create submission (user submits new trick for review)
export const createSubmissionSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  alternateNames: z.array(z.string()).default([]),
  definition: z.string().optional().nullable(),
  inventedBy: z.string().optional().nullable(),
  yearLanded: z.number().int().min(1900).max(2100).optional().nullable(),
  videoUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val, ctx) => {
      if (!val) return val;
      const youtubeId = getYoutubeVideoId(val);
      if (!youtubeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid YouTube URL",
        });
        return z.NEVER;
      }
      return `https://www.youtube.com/watch?v=${youtubeId}`;
    }),
  videoTimestamp: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  relationships: z.array(submissionRelationshipSchema).default([]),
});

export type CreateSubmissionArgs = z.infer<typeof createSubmissionSchema>;

export const getSubmissionSchema = z.object({
  id: z.number(),
});

export const listSubmissionsSchema = z
  .object({
    status: z.enum(TRICK_SUBMISSION_STATUSES).optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional();

export type ListSubmissionsArgs = z.infer<typeof listSubmissionsSchema>;
export type ListSubmissionsInput = z.input<typeof listSubmissionsSchema>;

// Review submission (admin approves/rejects)
export const reviewSubmissionSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().optional().nullable(),
});

export type ReviewSubmissionArgs = z.infer<typeof reviewSubmissionSchema>;

// Suggestion schemas
export const trickSuggestionDiffSchema = z.object({
  name: z
    .object({
      old: z.string(),
      new: z.string(),
    })
    .optional(),
  alternateNames: z
    .object({
      old: z.array(z.string()),
      new: z.array(z.string()),
    })
    .optional(),
  definition: z
    .object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
    .optional(),
  isPrefix: z
    .object({
      old: z.boolean(),
      new: z.boolean(),
    })
    .optional(),
  inventedBy: z
    .object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
    .optional(),
  yearLanded: z
    .object({
      old: z.number().nullable(),
      new: z.number().nullable(),
    })
    .optional(),
  videoUrl: z
    .object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
    .optional(),
  videoTimestamp: z
    .object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
    .optional(),
  notes: z
    .object({
      old: z.string().nullable(),
      new: z.string().nullable(),
    })
    .optional(),
  categories: z
    .object({
      old: z.array(z.string()),
      new: z.array(z.string()),
    })
    .optional(),
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
});

export type TrickSuggestionDiffInput = z.infer<
  typeof trickSuggestionDiffSchema
>;

export const createSuggestionSchema = z.object({
  trickId: z.number(),
  diff: trickSuggestionDiffSchema,
  reason: z.string().optional().nullable(),
});

export type CreateSuggestionArgs = z.infer<typeof createSuggestionSchema>;

export const getSuggestionSchema = z.object({
  id: z.number(),
});

export const listSuggestionsSchema = z
  .object({
    status: z.enum(TRICK_SUBMISSION_STATUSES).optional(),
    trickId: z.number().optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional();

export type ListSuggestionsArgs = z.infer<typeof listSuggestionsSchema>;
export type ListSuggestionsInput = z.input<typeof listSuggestionsSchema>;

export const reviewSuggestionSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().optional().nullable(),
});

export type ReviewSuggestionArgs = z.infer<typeof reviewSuggestionSchema>;
