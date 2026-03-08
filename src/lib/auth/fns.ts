import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { Resend } from "resend"

import AuthCodeTemplate from "../../../emails/auth-code"
import { db } from "~/db"
import { authCodes, users } from "~/db/schema"
import {
  enterCodeSchema,
  registerSchema,
  sendCodeSchema,
} from "~/lib/auth/schemas"
import { env, isDevelopment } from "~/lib/env"
import { invariant } from "~/lib/invariant"
import { useServerSession } from "~/lib/session/hooks"

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

export const sendAuthCodeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(sendCodeSchema))
  .handler(async ({ data: input }) => {
    const inFiveMinutes = new Date(Date.now() + 1000 * 60 * 5)
    const code = isDevelopment
      ? "9999"
      : String(Math.floor(Math.random() * 10_000)).padStart(4, "0")

    const [authCode] = await db
      .insert(authCodes)
      .values({
        email: input.email,
        id: nanoid(),
        code,
        expiresAt: inFiveMinutes,
      })
      .returning()

    if (isDevelopment) {
      console.log(`[dev] Auth code for ${input.email}: ${authCode.code}`)
      return
    }

    const { data, error } = await resendClient.emails.send({
      from: "Colby Thomas <colby@jrnxf.co>",
      to: [input.email],
      subject: "welcome to une.haus!",
      react: AuthCodeTemplate({ code: authCode.code }),
    })

    if (error) {
      console.error("❌ Email failed to send", error)
      // TODO: Log error to Sentry
      throw new Error(error.message)
    }

    if (data) {
      // log successful send to sentry
    }
  })

export const enterCodeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(enterCodeSchema)
  .handler(async ({ data: input }) => {
    const session = await useServerSession()
    return enterCodeImpl({ data: input, session })
  })

export async function enterCodeImpl({
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
    throw new Error("Invalid code")
  }

  const deleteCode = async () => {
    await db.delete(authCodes).where(eq(authCodes.id, authCode.id))
  }

  if (!authCode.user) {
    await deleteCode()
    return {
      status: "user_not_found",
    }
  }

  if (authCode.expiresAt < new Date()) {
    await deleteCode()
    invariant(false, "Code has expired")
  }

  await deleteCode()

  await session.update({
    user: authCode.user,
  })

  return {
    status: "success",
  }
}

export const registerServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(registerSchema))
  .handler(async ({ data: input }) => {
    const session = await useServerSession()
    await registerImpl({ data: input, session })
  })

export async function registerImpl({
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
  const {
    // TODO use code
    // code,
    email,
    name,
    bio,
  } = input

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
