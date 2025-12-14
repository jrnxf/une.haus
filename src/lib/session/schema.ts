import { z } from "zod";

export const hausSessionSchema = z.object({
  flash: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  sidebarOpen: z.boolean().default(true),
  deviceType: z.enum(["mobile", "desktop"]).optional(),
  user: z
    .object({
      avatarUrl: z.string().nullable(),
      email: z.string().email(),
      id: z.number(),
      name: z.string(),
    })
    .optional(),
});

export type HausSession = z.infer<typeof hausSessionSchema>;
export type HausSessionUser = HausSession["user"];

export const setFlashSchema = z.object({
  message: z.string(),
});

export const setThemeSchema = z.enum(["light", "dark", "system"]);

export const setSidebarSchema = z.boolean();
