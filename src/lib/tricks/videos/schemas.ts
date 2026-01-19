import { z } from "zod";

import { TRICK_VIDEO_STATUSES } from "~/db/schema";

// Submit video for a trick (user submits for review)
export const submitVideoSchema = z.object({
  trickId: z.number(),
  muxAssetId: z.string().min(1, "Video is required"),
  notes: z.string().optional().nullable(),
});

export type SubmitVideoArgs = z.infer<typeof submitVideoSchema>;

// List videos for a trick
export const listVideosSchema = z.object({
  trickId: z.number(),
  status: z.enum(TRICK_VIDEO_STATUSES).optional(),
});

export type ListVideosArgs = z.infer<typeof listVideosSchema>;
export type ListVideosInput = z.input<typeof listVideosSchema>;

// List all pending videos (admin)
export const listPendingVideosSchema = z
  .object({
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional();

export type ListPendingVideosArgs = z.infer<typeof listPendingVideosSchema>;
export type ListPendingVideosInput = z.input<typeof listPendingVideosSchema>;

// Review video (admin approves/rejects)
export const reviewVideoSchema = z.object({
  id: z.number(),
  status: z.enum(["active", "rejected"]),
  reviewNotes: z.string().optional().nullable(),
});

export type ReviewVideoArgs = z.infer<typeof reviewVideoSchema>;

// Reorder videos for a trick (admin)
export const reorderVideosSchema = z.object({
  trickId: z.number(),
  videoIds: z.array(z.number()),
});

export type ReorderVideosArgs = z.infer<typeof reorderVideosSchema>;

// Demote video from active to pending (admin)
export const demoteVideoSchema = z.object({
  id: z.number(),
});

export type DemoteVideoArgs = z.infer<typeof demoteVideoSchema>;

// Delete video (admin)
export const deleteVideoSchema = z.object({
  id: z.number(),
});

export type DeleteVideoArgs = z.infer<typeof deleteVideoSchema>;
