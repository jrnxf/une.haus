import { z } from "zod"

// List landings for a specific user (public — powers profile pages)
export const listLandingsForUserSchema = z.object({
  userId: z.number(),
})

// Land a trick: submit a proof video. The attestation is enforced here rather
// than stored — a row can only exist if it was confirmed, so a column would
// always be true.
export const landTrickSchema = z.object({
  trickId: z.number(),
  muxAssetId: z.string().min(1, "Video is required"),
  notes: z.string().max(200).optional().nullable(),
  confirmedSingleTrick: z.literal(true),
})

export type LandTrickArgs = z.infer<typeof landTrickSchema>

// Un-land a trick: delete the caller's own proof videos for it
export const unlandTrickSchema = z.object({
  trickId: z.number(),
})

export type UnlandTrickArgs = z.infer<typeof unlandTrickSchema>
