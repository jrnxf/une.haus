import { z } from "zod"

import { FLAG_ENTITY_TYPES } from "~/db/schema"

export const flagContentSchema = z.object({
  entityType: z.enum(FLAG_ENTITY_TYPES),
  entityId: z.number(),
  reason: z.string().min(1),
  parentEntityId: z.number().optional(),
})

export const resolveFlagSchema = z.object({
  flagId: z.number(),
  resolution: z.enum(["dismissed", "removed"]),
})
