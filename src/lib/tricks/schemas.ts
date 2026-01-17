import getYoutubeVideoId from "get-youtube-id";
import { z } from "zod";

import { TRICK_RELATIONSHIP_TYPES } from "~/db/schema";

// Category schemas
export const createCategorySchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int(),
});

export type CreateCategoryArgs = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.extend({
  id: z.number(),
});

export type UpdateCategoryArgs = z.infer<typeof updateCategorySchema>;

export const deleteCategorySchema = z.number();

export const listCategoriesSchema = z.object({}).optional();

// Modifier schemas
export const createModifierSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int(),
});

export type CreateModifierArgs = z.infer<typeof createModifierSchema>;

export const updateModifierSchema = createModifierSchema.extend({
  id: z.number(),
});

export type UpdateModifierArgs = z.infer<typeof updateModifierSchema>;

export const deleteModifierSchema = z.number();

export const listModifiersSchema = z.object({}).optional();

// Trick relationship schema
export const trickRelationshipSchema = z.object({
  targetTrickId: z.number(),
  type: z.enum(TRICK_RELATIONSHIP_TYPES),
});

// Core trick schemas
export const createTrickSchema = z.object({
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
  relationships: z.array(trickRelationshipSchema).default([]),
});

export type CreateTrickArgs = z.infer<typeof createTrickSchema>;

export const updateTrickSchema = createTrickSchema.extend({
  id: z.number(),
});

export type UpdateTrickArgs = z.infer<typeof updateTrickSchema>;

export const deleteTrickSchema = z.number();

export const getTrickSchema = z.object({
  slug: z.string(),
});

export const getTrickByIdSchema = z.object({
  id: z.number(),
});

export const listTricksSchema = z
  .object({
    categoryId: z.number().optional(),
    q: z.string().optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .optional();

export type ListTricksArgs = z.infer<typeof listTricksSchema>;
export type ListTricksInput = z.input<typeof listTricksSchema>;

// Search tricks for selector
export const searchTricksSchema = z.object({
  q: z.string().optional(),
  excludeIds: z.array(z.number()).default([]),
  limit: z.number().int().min(1).max(50).default(20),
});

export type SearchTricksArgs = z.infer<typeof searchTricksSchema>;

// Form-specific relationship type (includes display info for selectors)
export const trickRelationshipFormSchema = z.object({
  targetTrickId: z.number(),
  targetTrickSlug: z.string(),
  targetTrickName: z.string(),
  type: z.enum(TRICK_RELATIONSHIP_TYPES),
});

export type TrickRelationshipFormValue = z.infer<
  typeof trickRelationshipFormSchema
>;

// Form schema - extends createTrickSchema with separate relationship arrays for UI
export const trickFormSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  alternateNames: z.array(z.string()),
  definition: z.string().nullable(),
  inventedBy: z.string().nullable(),
  yearLanded: z.number().int().min(1900).max(2100).nullable(),
  videoUrl: z.string().nullable(),
  videoTimestamp: z.string().nullable(),
  notes: z.string().nullable(),
  // Separate arrays for the form UI
  prerequisites: z.array(trickRelationshipFormSchema),
  optionalPrerequisites: z.array(trickRelationshipFormSchema),
  relatedTricks: z.array(trickRelationshipFormSchema),
});

export type TrickFormValues = z.infer<typeof trickFormSchema>;
