import { z } from "zod"

export const saveHighScoreSchema = z.object({
  score: z.number().int().min(0),
})
