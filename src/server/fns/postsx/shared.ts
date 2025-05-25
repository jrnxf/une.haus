import { z } from "zod";

import { POST_TAGS } from "~/db/schema";

export const basePostSchema = z.object({
  content: z.string().min(1, { message: "Required" }),
  imageUrl: z.string().url().optional().nullable(),
  tags: z
    .array(z.enum(POST_TAGS))
    .min(1, { message: "Required" })
    .max(3, { message: "No more than three tags allowed" }),
  title: z
    .string()
    .min(1, { message: "Required" })
    .max(60, { message: "Title must be less than 60 characters" }),
  videoUploadId: z.string().optional().nullable(),
  youtubeVideoId: z.string().min(11).optional().nullable(), // youtube ids are 11 characters
});
