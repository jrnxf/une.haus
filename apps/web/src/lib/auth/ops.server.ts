import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { Resend } from "resend"

import AuthCodeTemplate from "../../../emails/auth-code"
import { db } from "~/db"
import { authCodes, users } from "~/db/schema"
import { rateLimit } from "~/lib/auth/rate-limit"
import { env } from "~/lib/env"
import { logger } from "~/lib/logger"
import { type HausSession } from "~/lib/session/schema"

const resendClient = new Resend(env.RESEND_API_KEY)

// RFC 2606 / 6761 reserved domains. These only ever appear in tests and
// fixtures — never a real recipient — so we never hit the live Resend API for
// them. An unmocked integration test once drained the entire daily email quota
// by sending real magic-link codes to addresses like ratelimit@example.com.
const RESERVED_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
])
const RESERVED_EMAIL_TLDS = [".test", ".example", ".invalid", ".localhost"]

function isReservedRecipient(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase()
  return (
    RESERVED_EMAIL_DOMAINS.has(domain) ||
    RESERVED_EMAIL_TLDS.some((tld) => domain.endsWith(tld))
  )
}

type SessionStore = {
  data: Partial<HausSession>
  update: (payload: Partial<HausSession>) => Promise<unknown>
}

export async function sendAuthCode({
  data: input,
  ip = "unknown",
}: {
  data: { email: string }
  ip?: string
}) {
  // Max 3 codes per email per 15 min, and 10 sends per IP per 15 min.
  const FIFTEEN_MIN = 15 * 60 * 1000
  if (!rateLimit(`send:email:${input.email}`, 3, FIFTEEN_MIN)) {
    throw new Error("Too many code requests. Please wait a few minutes.")
  }
  if (!rateLimit(`send:ip:${ip}`, 10, FIFTEEN_MIN)) {
    throw new Error("Too many code requests. Please wait a few minutes.")
  }

  const inFiveMinutes = new Date(Date.now() + 1000 * 60 * 5)
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")

  await db.delete(authCodes).where(eq(authCodes.email, input.email))

  const [authCode] = await db
    .insert(authCodes)
    .values({
      email: input.email,
      id: nanoid(),
      code,
      expiresAt: inFiveMinutes,
    })
    .returning()

  // Defense-in-depth: never send to reserved/test domains. The auth code is
  // already persisted above, so any flow that needs it can read it; we just
  // skip the live email. Prevents tests/fixtures from burning the Resend quota.
  if (isReservedRecipient(input.email)) {
    logger.warn("skipping auth email to reserved domain", {
      email: input.email,
    })
    return
  }

  const { data, error } = await resendClient.emails.send({
    from: "Colby Thomas <colby@jrnxf.co>",
    to: [input.email],
    subject: "welcome to une.haus!",
    react: AuthCodeTemplate({ code: authCode.code }),
  })

  if (error) {
    logger.error("auth code email send failed", {
      email: input.email,
      err: error,
    })
    throw new Error(error.message)
  }

  if (data) {
    // log successful send to sentry
  }
}

export async function enterCode({
  data: input,
  session,
  ip = "unknown",
}: {
  data: { code: string }
  session: SessionStore
  ip?: string
}) {
  // Max 10 code-entry attempts per IP per 15 min.
  if (!rateLimit(`enter:ip:${ip}`, 10, 15 * 60 * 1000)) {
    throw new Error("Too many attempts. Please wait a few minutes.")
  }

  const { code } = input

  const [authCode] = await db
    .select({
      id: authCodes.id,
      email: authCodes.email,
      expiresAt: authCodes.expiresAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        avatarId: users.avatarId,
        bio: users.bio,
        disciplines: users.disciplines,
      },
    })
    .from(authCodes)
    .where(eq(authCodes.code, code))
    .leftJoin(users, eq(users.email, authCodes.email))
    .limit(1)

  if (!authCode) {
    return { status: "invalid_code" as const }
  }

  const deleteCode = async () => {
    await db.delete(authCodes).where(eq(authCodes.id, authCode.id))
  }

  if (authCode.expiresAt < new Date()) {
    await deleteCode()
    return { status: "expired" as const }
  }

  if (!authCode.user) {
    await deleteCode()
    // The email column predates notNull; a code without one can't register.
    if (!authCode.email) {
      return { status: "invalid_code" as const }
    }
    // Email ownership is now proven but no account exists. Stash the email so
    // register can read it server-side — the client never supplies it.
    await session.update({ pendingEmail: authCode.email })
    return { status: "user_not_found" as const }
  }

  await deleteCode()

  await session.update({
    user: authCode.user,
    pendingEmail: undefined,
  })

  return {
    status: "success",
  }
}

export async function register({
  data: input,
  session,
}: {
  data: {
    bio?: null | string
    name: string
  }
  session: SessionStore
}) {
  const { name, bio } = input

  // Set by enterCode when a verified code has no matching account. Its
  // presence proves the visitor owns this email.
  const email = session.data.pendingEmail
  if (!email) {
    throw new Error("No verified email. Please request a new code.")
  }

  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (existingUsers.length > 0) {
    throw new Error("User already exists")
  }

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      name,
      bio,
    })
    .returning()

  if (!newUser) {
    throw new Error("Failed to create user")
  }

  await session.update({
    user: newUser,
    pendingEmail: undefined,
  })
}
