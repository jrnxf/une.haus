import { z } from "zod"

import { TRICK_RELATIONSHIP_TYPES } from "~/db/schema"

// Modifier schemas
export const createModifierSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
})

export const updateModifierSchema = createModifierSchema.extend({
  id: z.number(),
})

export const deleteModifierSchema = z.number()

export const listModifiersSchema = z.object({}).optional()

// Element schemas
export const createElementSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
})

export const updateElementSchema = createElementSchema.extend({
  id: z.number(),
})

export const deleteElementSchema = z.number()

export const listElementsSchema = z.object({}).optional()

// Trick relationship schema
const trickRelationshipSchema = z.object({
  targetTrickId: z.number(),
  type: z.enum(TRICK_RELATIONSHIP_TYPES),
})

// Core trick schemas
export const createTrickSchema = z.object({
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
  muxAssetIds: z
    .array(z.string())
    .max(5, "Maximum 5 videos allowed")
    .default([]),
  notes: z.string().optional().nullable(),
  relationships: z.array(trickRelationshipSchema).default([]),
  elementIds: z.array(z.number()).default([]),
})

export type CreateTrickArgs = z.infer<typeof createTrickSchema>

export const updateTrickSchema = createTrickSchema.extend({
  id: z.number(),
})

export type UpdateTrickArgs = z.infer<typeof updateTrickSchema>

export const deleteTrickSchema = z.number()

export const getTrickSchema = z.object({
  slug: z.string(),
})

export const getTrickByIdSchema = z.object({
  id: z.number(),
})

export const listTricksSchema = z
  .object({
    elementId: z.number().optional(),
    q: z.string().optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .optional()

export type ListTricksInput = z.input<typeof listTricksSchema>

// search tricks for selector
export const searchTricksSchema = z.object({
  q: z.string().optional(),
  excludeIds: z.array(z.number()).default([]),
})

// Form-specific relationship type (includes display info for selectors)
// Only includes types that the form UI supports (not optional_prerequisite)
const trickRelationshipFormSchema = z.object({
  targetTrickId: z.number(),
  targetTrickSlug: z.string(),
  targetTrickName: z.string(),
  type: z.enum(["prerequisite", "related"]),
})

// Element form schema for tag selector
export const elementFormSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
})

export type ElementFormValue = z.infer<typeof elementFormSchema>

// Form schema - extends createTrickSchema with separate relationship arrays for UI
export const trickFormSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  name: z.string().min(1, "Name is required"),
  alternateNames: z.array(z.string()),
  description: z.string().nullable(),
  inventedBy: z.string().nullable(),
  inventedByUserId: z.number().nullable(),
  yearLanded: z.number().int().min(1900).max(2100).nullable(),
  muxAssetIds: z.array(z.string()).max(5, "Maximum 5 videos allowed"),
  notes: z.string().nullable(),
  // Separate arrays for the form UI
  prerequisites: z.array(trickRelationshipFormSchema),
  relatedTricks: z.array(trickRelationshipFormSchema),
  elements: z.array(elementFormSchema),
})

export type TrickFormValues = z.infer<typeof trickFormSchema>
