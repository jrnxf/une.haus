import { z } from "zod";

// Get active chain
export const getActiveChainSchema = z.object({});

// Get specific set
export const getSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
});

export type GetSetArgs = z.infer<typeof getSetSchema>;

// Start a new chain (first set)
export const startChainSchema = z.object({
  name: z.string().min(1, { message: "Set name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
});

export type StartChainArgs = z.infer<typeof startChainSchema>;

// Back up a set (continue chain)
export const backUpSetSchema = z.object({
  parentSetId: z.number().positive({ message: "Parent set is required" }),
  name: z.string().min(1, { message: "New set name is required" }),
  muxAssetId: z.string().min(1, { message: "Video is required" }),
});

export type BackUpSetArgs = z.infer<typeof backUpSetSchema>;

// Flag a set
export const flagSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
  reason: z.string().min(1, { message: "Reason is required" }),
});

export type FlagSetArgs = z.infer<typeof flagSetSchema>;

// Resolve flag (admin only)
export const resolveFlagSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
  approved: z.boolean(),
});

export type ResolveFlagArgs = z.infer<typeof resolveFlagSchema>;

// Delete set (owner only)
export const deleteSetSchema = z.object({
  setId: z.number().positive({ message: "Required" }),
});

export type DeleteSetArgs = z.infer<typeof deleteSetSchema>;

// List archived chains
export const listArchivedChainsSchema = z.object({
  limit: z.number().positive().optional().default(10),
  offset: z.number().nonnegative().optional().default(0),
});

export type ListArchivedChainsArgs = z.infer<typeof listArchivedChainsSchema>;
