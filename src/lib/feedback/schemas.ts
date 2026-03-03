import { z } from "zod"

export const submitFeedbackSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Feedback is required" })
    .max(5000, { message: "Feedback must be less than 5000 characters" }),
  media: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("image"),
        value: z.string(),
      }),
      z.object({
        type: z.literal("video"),
        assetId: z.string(),
        playbackId: z.string(),
      }),
    ])
    .optional()
    .nullable(),
})

export type SubmitFeedbackArgs = z.infer<typeof submitFeedbackSchema>
