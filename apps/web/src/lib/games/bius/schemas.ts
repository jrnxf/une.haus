import { z } from "zod"

// Start a new empty BIU round (admin only)
export const startRoundSchema = z.object({})

// Create first set in an empty round
export const createFirstSetSchema = z.object({
  roundId: z.number().positive({ message: "required" }),
  name: z.string().trim().min(1, { message: "required" }),
  instructions: z.string().optional(),
  muxAssetId: z.string().min(1, { message: "required" }),
})

// Get specific set
export const getSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

// Back up a set (continue chain)
export const backUpSetSchema = z.object({
  roundId: z.number().positive({ message: "required" }),
  name: z.string().trim().min(1, { message: "required" }),
  instructions: z.string().optional(),
  muxAssetId: z.string().min(1, { message: "required" }),
})

// Update set (owner only)
export const updateSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
  name: z.string().trim().min(1, { message: "required" }),
})

// Delete set (owner only)
export const deleteSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})
