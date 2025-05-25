import { z } from "zod";

export const recordTypeWithLikes = [
  "chatMessage",
  "post",
  "postMessage",
] as const;

export const baseSchema = z.object({
  recordId: z.number(), // the id of the thing receiving the message (in the case of chat just pass in -1 since there is no id)
  type: z.enum(recordTypeWithLikes),
});

export const reactionSchema = baseSchema.extend({
  action: z.enum(["like", "unlike"]),
});

export type Reaction = z.infer<typeof reactionSchema>;

export type RecordWithLikes = z.infer<typeof baseSchema>;

export type RecordWithLikesType = RecordWithLikes["type"];
