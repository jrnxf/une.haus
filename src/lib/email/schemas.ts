import { z } from "zod";

export const sendMagicLinkSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  redirect: z.string().optional().default("/auth/me"),
});
