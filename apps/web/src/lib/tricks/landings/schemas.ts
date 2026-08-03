import { z } from "zod"

// List landings for a specific user (public — powers profile pages)
export const listLandingsForUserSchema = z.object({
  userId: z.number(),
})
