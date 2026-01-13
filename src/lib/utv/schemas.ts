import { z } from "zod";

export const listUtvVideosSchema = z.object({
  cursor: z.number().nullish(),
  q: z.string().optional(),
});
