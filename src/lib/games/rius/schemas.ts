import { z } from "zod"

export const baseRiuSetSchema = z.object({
  instructions: z.string().optional(),
  name: z.string().trim().min(1, { message: "required" }),
})

export const createRiuSetSchema = baseRiuSetSchema.extend({
  muxAssetId: z.string().min(1, { message: "required" }),
})

export type CreateRiuSetArgs = z.infer<typeof createRiuSetSchema>

export const getRiuSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

export type GetRiuSetArgs = z.infer<typeof getRiuSetSchema>

export const getRiuSubmissionSchema = z.object({
  submissionId: z.number().positive({ message: "Required" }),
})

export type GetRiuSubmissionArgs = z.infer<typeof getRiuSubmissionSchema>

export const updateRiuSetSchema = baseRiuSetSchema.extend({
  riuSetId: z.number().positive({ message: "Required" }),
})

export type UpdateRiuSetArgs = z.infer<typeof updateRiuSetSchema>

export const createRiuSubmissionSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
  muxAssetId: z.string().min(1, { message: "Required" }),
})

export type CreateRiuSubmissionArgs = z.infer<typeof createRiuSubmissionSchema>

export const deleteRiuSetSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
})

export const deleteRiuSubmissionSchema = z.object({
  submissionId: z.number().positive({ message: "Required" }),
})

export const getArchivedRiusSchema = z.object({
  riuId: z.number().positive({ message: "Required" }).optional(),
})

export type GetArchivedRiusArgs = z.infer<typeof getArchivedRiusSchema>
