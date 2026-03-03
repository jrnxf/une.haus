import { z } from "zod"

export const sendCodeSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

export const enterCodeSchema = z.object({
  code: z.string().trim(),
})

export const registerSchema = z.object({
  code: z.string().trim(),
  email: z.string().trim().email().toLowerCase(),
  name: z.string().trim().min(1, { message: "Required" }),
  bio: z.string().trim().optional(),
})
