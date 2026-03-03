import { z } from "zod"

// Get specific set
export const getSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

export type GetSetArgs = z.infer<typeof getSetSchema>

// Start a new round (first set) - admin only
export const startRoundSchema = z.object({
  name: z.string().min(1, { message: "Trick name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
})

export type StartRoundArgs = z.infer<typeof startRoundSchema>

// Add set (continue round with full line + new trick)
export const addSetSchema = z.object({
  parentSetId: z.number().positive({ message: "Parent set is required" }),
  name: z.string().min(1, { message: "New trick name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
})

export type AddSetArgs = z.infer<typeof addSetSchema>

// Vote to archive round
export const voteToArchiveSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})

export type VoteToArchiveArgs = z.infer<typeof voteToArchiveSchema>

// Remove archive vote
export const removeArchiveVoteSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})

export type RemoveArchiveVoteArgs = z.infer<typeof removeArchiveVoteSchema>

// Archive round (admin only)
export const archiveRoundSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})

export type ArchiveRoundArgs = z.infer<typeof archiveRoundSchema>

// Delete set (owner only)
export const deleteSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
})

export type DeleteSetArgs = z.infer<typeof deleteSetSchema>

// List archived rounds
export const listArchivedRoundsSchema = z.object({})

export type ListArchivedRoundsArgs = z.infer<typeof listArchivedRoundsSchema>

// Get specific archived round
export const getArchivedRoundSchema = z.object({
  roundId: z.number().positive({ message: "Required" }),
})

export type GetArchivedRoundArgs = z.infer<typeof getArchivedRoundSchema>
