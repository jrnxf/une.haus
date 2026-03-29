import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { Resend } from "resend"

import AuthCodeTemplate from "../../../emails/auth-code"
import { db } from "~/db"
import { authCodes, users } from "~/db/schema"
import { env } from "~/lib/env"

const resendClient = new Resend(env.RESEND_API_KEY)

type SessionStore = {
  update: (payload: {
    user: {
      avatarId: null | string
      email: string
      id: number
      name: string
    }
  }) => Promise<unknown>
}

export async function sendAuthCode({
  data: input,
}: {
  data: {
    email: string
  }
}) {
  const inFiveMinutes = new Date(Date.now() + 1000 * 60 * 5)
  const code = String(Math.floor(Math.random() * 10_000)).padStart(4, "0")

  const [authCode] = await db
    .insert(authCodes)
    .values({
      email: input.email,
      id: nanoid(),
      code,
      expiresAt: inFiveMinutes,
    })
    .returning()

  const { data, error } = await resendClient.emails.send({
    from: "Colby Thomas <colby@jrnxf.co>",
    to: [input.email],
    subject: "welcome to une.haus!",
    react: AuthCodeTemplate({ code: authCode.code }),
  })

  if (error) {
    console.error("❌ Email failed to send", error)
    throw new Error(error.message)
  }

  if (data) {
    // log successful send to sentry
  }
}

export async function enterCode({
  data: input,
  session,
}: {
  data: {
    code: string
  }
  session: SessionStore
}) {
  const { code } = input

  const [authCode] = await db
    .select({
      id: authCodes.id,
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

  if (!authCode.user) {
    await deleteCode()
    return { status: "user_not_found" as const }
  }

  if (authCode.expiresAt < new Date()) {
    await deleteCode()
    return { status: "expired" as const }
  }

  await deleteCode()

  await session.update({
    user: authCode.user,
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
    email: string
    name: string
  }
  session: SessionStore
}) {
  const { email, name, bio } = input

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
  })
}
