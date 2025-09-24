import { z } from "zod";

export const sendCodeSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const enterCodeSchema = z.object({
  code: z.string().trim(),
});
