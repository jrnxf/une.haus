import { z } from "zod";

import { POST_TAGS } from "~/db/schema";

export const getPostSchema = z.object({
  postId: z.coerce.number(),
});

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, { message: "Title is required" })
    .max(60, { message: "Title must be less than 60 characters" }),
  content: z.string({ message: "Content is required" }).min(1),
  tags: z
    .array(z.enum(POST_TAGS), { message: "At least one tag is required" })
    .min(1, { message: "At least one tag is required" })
    .max(3, { message: "No more than three tags allowed" }),
  media: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("image"),
        value: z.string().url().optional().nullable(),
      }),
      z.object({
        type: z.literal("video"),
        value: z.string().optional().nullable(),
      }),
      z.object({
        type: z.literal("youtube"),
        value: z.string().min(11).optional().nullable(), // youtube ids are 11 characters
      }),
    ])
    .optional()
    .nullable(),
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
});
