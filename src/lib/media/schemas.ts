import { z } from "zod";

export const createPresignedS3UrlSchema = z.object({
  fileName: z.string(),
  prefix: z.string().optional().default("media-skrrrt-final"),
});
