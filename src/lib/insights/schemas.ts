import { z } from "zod"

// The day ranges the insights page offers. 30 is the default.
export const INSIGHTS_RANGES = [7, 30, 90] as const

export const insightsSchema = z.object({
  days: z.coerce
    .number()
    .refine((days) => INSIGHTS_RANGES.some((range) => range === days))
    // default makes the param optional in links, and catch turns a bad
    // value into the default.
    .default(30)
    .catch(30),
})

export type InsightsInput = z.infer<typeof insightsSchema>
