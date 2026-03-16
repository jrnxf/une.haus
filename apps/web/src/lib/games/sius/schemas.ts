import { z } from "zod"

// Get specific set
export const getSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

// Start a new empty round - admin only
export const startRoundSchema = z.object({})

// Create first set in an empty round
export const createFirstSetSchema = z.object({
  roundId: z.number().positive({ message: "required" }),
  name: z.string().trim().min(1, { message: "required" }),
  instructions: z.string().optional(),
  muxAssetId: z.string().min(1, { message: "required" }),
})

// Add set (continue round with full line + new trick)
export const addSetSchema = z.object({
  roundId: z.number().positive({ message: "required" }),
  name: z.string().trim().min(1, { message: "required" }),
  instructions: z.string().optional(),
  muxAssetId: z.string().min(1, { message: "required" }),
  confirmLine: z.boolean().refine((value) => value, {
    message: "you must confirm your video has the trick line in order",
  }),
})

// Vote to archive round
export const voteToArchiveSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})

// Remove archive vote
export const removeArchiveVoteSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})

// Archive round (admin only)
export const archiveRoundSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
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

// Get specific archived round
export const getArchivedRoundSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})
