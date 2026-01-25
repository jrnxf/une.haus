import getYoutubeVideoId from "get-youtube-id";
import { z } from "zod";

import { POST_TAGS } from "~/db/schema";

/** Parses comma-separated string or array into array */
const commaArrayOf = <T extends string>(enumValues: readonly [T, ...T[]]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const arr = typeof val === "string" ? val.split(",").filter(Boolean) : val;
      // Validate against enum
      const parsed = z.array(z.enum(enumValues)).safeParse(arr);
      return parsed.success ? parsed.data : undefined;
    });

export const getPostSchema = z.object({
  postId: z.coerce.number(),
});

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" })
    .max(60, { message: "Title must be less than 60 characters" }),
  content: z
    .string({ message: "Content is required" })
    .min(1, { message: "Content is required" }),
  tags: z
    .array(z.enum(POST_TAGS), { message: "At least one tag is required" })
    .min(1, { message: "At least one tag is required" })
    .max(3, { message: "No more than three tags allowed" }),
  media: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("image"),
        value: z.string(),
      }),
      z.object({
        type: z.literal("video"),
        value: z.string(), // asset id
      }),
      z.object({
        type: z.literal("youtube"),
        value: z.string(),
      }),
    ])
    .optional()
    .nullable()
    .transform((data, ctx) => {
      if (!data) {
        return data;
      }

      if (data.type === "youtube") {
        const youtubeId = getYoutubeVideoId(data.value ?? "");

        if (!youtubeId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid YouTube URL",
          });
          return z.NEVER;
        }

        return {
          ...data,
          value: youtubeId,
        };
      }
      return data;
    }),
});

export type CreatePostArgs = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema.extend({
  postId: z.number(),
});

export type UpdatePostArgs = z.infer<typeof updatePostSchema>;

export const deletePostSchema = z.number(); // postId

export type DeletePostArgs = z.infer<typeof deletePostSchema>;

export const listPostsSchema = z.object({
  cursor: z.number().nullish(),
  q: z.string().optional(),
  tags: commaArrayOf(POST_TAGS),
});
