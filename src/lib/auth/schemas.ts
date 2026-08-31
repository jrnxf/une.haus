import { z } from "zod"

import { USER_DISCIPLINES } from "~/db/schema"
import { userLocationSchema, userSocialsSchema } from "~/lib/users/schemas"

export const sendCodeSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

export const enterCodeSchema = z.object({
  code: z.string().trim(),
})

// The email is deliberately absent: registration only proceeds from a session
// whose email was just verified via enterCode (stored as `pendingEmail`), so
// the server reads it from the session instead of trusting client input.
// Avatar is also absent — uploads require an authed session, so it stays on
// the profile edit page.
export const registerSchema = z.object({
  name: z.string().trim().min(1, { message: "Required" }),
  bio: z.string().trim().optional().nullable(),
  location: userLocationSchema.optional().nullable(),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).optional().nullable(),
  socials: userSocialsSchema.optional().nullable(),
})

// Shared by all /auth routes. Must not inject defaults or extra keys: a
// validateSearch result that differs from the URL's own params makes the
// router 307 to the "normalized" URL on every SSR request, which never
// converges — an infinite redirect loop on any direct page load.
export const authSearchSchema = z.object({
  redirect: z.string().optional(),
})
