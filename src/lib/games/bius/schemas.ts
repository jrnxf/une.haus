import { z } from "zod"

// Get specific set
export const getSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

export type GetSetArgs = z.infer<typeof getSetSchema>

// Back up a set (continue chain)
export const backUpSetSchema = z.object({
  parentSetId: z.number().positive({ message: "Parent set is required" }),
  name: z.string().min(1, { message: "New set name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
})

export type BackUpSetArgs = z.infer<typeof backUpSetSchema>

// Delete set (owner only)
export const deleteSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

export type DeleteSetArgs = z.infer<typeof deleteSetSchema>
