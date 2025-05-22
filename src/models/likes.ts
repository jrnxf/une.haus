import { z } from "zod";

export const recordTypeWithLikes = [
  "chatMessage",
  "post",
  "postMessage",
  "user",
] as const;

export type RecordWithLikes = {
  id: number;
  likes: {
    user: {
      id: number;
      name: string;
    };
  }[];
};

export const likeUnlikeSchema = z.object({
  action: z.enum(["like", "unlike"]),
  recordId: z.number(), // the id of the thing being liked
  type: z.enum(recordTypeWithLikes),
});
