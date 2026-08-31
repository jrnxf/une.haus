import { z } from "zod"

const baseRiuSetSchema = z.object({
  instructions: z.string().optional(),
  name: z.string().trim().min(1, { message: "required" }),
})

export const createRiuSetSchema = baseRiuSetSchema.extend({
  muxAssetId: z.string().min(1, { message: "required" }),
})

export const getRiuSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

export const getRiuSubmissionSchema = z.object({
  submissionId: z.number().positive({ message: "Required" }),
})

export const updateRiuSetSchema = baseRiuSetSchema.extend({
  riuSetId: z.number().positive({ message: "Required" }),
})

export const createRiuSubmissionSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
  muxAssetId: z.string().min(1, { message: "Required" }),
})

export const deleteRiuSetSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
})

export const deleteRiuSubmissionSchema = z.object({
  submissionId: z.number().positive({ message: "Required" }),
})

export const getArchivedRiusSchema = z.object({
  riuId: z.number().positive({ message: "Required" }).optional(),
})

export const ARCHIVED_ROUNDS_PAGE_SIZE = 24

export const listArchivedRiuRoundsSchema = z.object({
  cursor: z.number().nullish(),
})
