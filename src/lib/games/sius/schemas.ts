import { z } from "zod";

// Get specific stack
export const getStackSchema = z.object({
  stackId: z.number().positive({ message: "Required" }),
});

export type GetStackArgs = z.infer<typeof getStackSchema>;

// Start a new chain (first stack) - admin only
export const startChainSchema = z.object({
  name: z.string().min(1, { message: "Trick name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
});

export type StartChainArgs = z.infer<typeof startChainSchema>;

// Stack up (continue chain with full line + new trick)
export const stackUpSchema = z.object({
  parentStackId: z.number().positive({ message: "Parent stack is required" }),
  name: z.string().min(1, { message: "New trick name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
});

export type StackUpArgs = z.infer<typeof stackUpSchema>;

// Vote to archive chain
export const voteToArchiveSchema = z.object({
  chainId: z.number().positive({ message: "Required" }),
});

export type VoteToArchiveArgs = z.infer<typeof voteToArchiveSchema>;

// Remove archive vote
export const removeArchiveVoteSchema = z.object({
  chainId: z.number().positive({ message: "Required" }),
});

export type RemoveArchiveVoteArgs = z.infer<typeof removeArchiveVoteSchema>;

// Archive chain (admin only)
export const archiveChainSchema = z.object({
  chainId: z.number().positive({ message: "Required" }),
});

export type ArchiveChainArgs = z.infer<typeof archiveChainSchema>;

// Delete stack (owner only)
export const deleteStackSchema = z.object({
  stackId: z.number().positive({ message: "Required" }),
});

export type DeleteStackArgs = z.infer<typeof deleteStackSchema>;

// List archived chains
export const listArchivedChainsSchema = z.object({
  limit: z.number().positive().optional().default(10),
  offset: z.number().nonnegative().optional().default(0),
});

export type ListArchivedChainsArgs = z.infer<typeof listArchivedChainsSchema>;
