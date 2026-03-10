import { z } from "zod"

export const flashTypeEnum = z.enum(["info", "error", "warning", "success"])
export type FlashType = z.infer<typeof flashTypeEnum>

export const flashSchema = z.object({
  type: flashTypeEnum,
  message: z.string(),
})
export type Flash = z.infer<typeof flashSchema>

export const hausSessionSchema = z.object({
  flash: flashSchema.optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  sidebarOpen: z.boolean().default(true),
  user: z
    .object({
      avatarId: z.string().nullable(),
      email: z.string().email(),
      id: z.number(),
      name: z.string(),
    })
    .optional(),
})

export type HausSession = z.infer<typeof hausSessionSchema>
export type HausSessionUser = HausSession["user"]

export const setFlashSchema = flashSchema

export const setThemeSchema = z.enum(["light", "dark", "system"])

export const setSidebarSchema = z.boolean()
