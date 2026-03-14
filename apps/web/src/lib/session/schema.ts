import { z } from "zod"

const flashTypeEnum = z.enum(["info", "error", "warning", "success"])

const flashSchema = z.object({
  type: flashTypeEnum,
  message: z.string(),
})

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

export const setFlashSchema = flashSchema

export const setThemeSchema = z.enum(["light", "dark", "system"])

export const setSidebarSchema = z.boolean()
