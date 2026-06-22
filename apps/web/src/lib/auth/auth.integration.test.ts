import { beforeEach, describe, expect, it, mock } from "bun:test"
import { nanoid } from "nanoid"

// Stub the Resend client before importing ops.server (which constructs a real
// `new Resend(...)` at module load). RESEND_API_KEY is set in the test env, so
// without this every sendAuthCode call would send a real "welcome" email and
// burn the daily Resend quota. Mirrors the send-digests / game-start tests.
const sendMock = mock((_payload: { to: string[] }) =>
  Promise.resolve({ data: { id: "email-id" }, error: null }),
)

mock.module("resend", () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

const { enterCode, register, sendAuthCode } = await import("./ops.server")

import { db } from "~/db"
import { authCodes } from "~/db/schema"
import { __resetRateLimits } from "~/lib/auth/rate-limit"
import { clearSession, getSession } from "~/lib/session/ops"
import { type HausSession } from "~/lib/session/schema"
import { seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
  __resetRateLimits()
  sendMock.mockClear()
})

function createFakeSession(initialData: Partial<HausSession> = {}) {
  const updates: Array<Partial<HausSession>> = []
  let cleared = false
  const state: Partial<HausSession> = { ...initialData }

  return {
    session: {
      data: state,
      async clear() {
        cleared = true
        for (const key of Object.keys(state) as Array<keyof HausSession>) {
          delete state[key]
        }
      },
      async update(payload: Partial<HausSession>) {
        updates.push(payload)
        Object.assign(state, payload)
      },
    },
    get cleared() {
      return cleared
    },
    get data() {
      return state
    },
    get updates() {
      return updates
    },
  }
}

describe("auth integration", () => {
  it("enterCode logs in an existing user and deletes the auth code", async () => {
    const user = await seedUser({
      email: "login@example.com",
      name: "Login User",
    })
    const fakeSession = createFakeSession()

    await db.insert(authCodes).values({
      code: "1111",
      email: user.email,
      expiresAt: new Date(Date.now() + 60_000),
      id: "code-success",
    })

    const result = await enterCode({
      data: { code: "1111" },
      session: fakeSession.session,
    })

    expect(result).toEqual({ status: "success" })
    expect(fakeSession.data.user).toEqual(
      expect.objectContaining({
        avatarId: user.avatarId,
        email: user.email,
        id: user.id,
        name: user.name,
      }),
    )
    expect(await db.query.authCodes.findMany()).toHaveLength(0)
  })

  it("enterCode returns expired status and deletes the code", async () => {
    const user = await seedUser({
      email: "expired@example.com",
      name: "Expired User",
    })
    const fakeSession = createFakeSession()

    await db.insert(authCodes).values({
      code: "2222",
      email: user.email,
      expiresAt: new Date(Date.now() - 60_000),
      id: "code-expired",
    })

    const result = await enterCode({
      data: { code: "2222" },
      session: fakeSession.session,
    })

    expect(result).toEqual({ status: "expired" })
    expect(fakeSession.updates).toHaveLength(0)
    expect(await db.query.authCodes.findMany()).toHaveLength(0)
  })

  it("enterCode returns invalid_code status without mutating session state", async () => {
    const fakeSession = createFakeSession()

    const result = await enterCode({
      data: { code: "9999" },
      session: fakeSession.session,
    })

    expect(result).toEqual({ status: "invalid_code" })
    expect(fakeSession.updates).toHaveLength(0)
  })

  it("enterCode returns user_not_found and deletes the code when the email has no user", async () => {
    const fakeSession = createFakeSession()

    await db.insert(authCodes).values({
      code: "3333",
      email: "unknown@example.com",
      expiresAt: new Date(Date.now() + 60_000),
      id: "code-missing-user",
    })

    const result = await enterCode({
      data: { code: "3333" },
      session: fakeSession.session,
    })

    expect(result).toEqual({ status: "user_not_found" })
    expect(fakeSession.updates).toHaveLength(0)
    expect(await db.query.authCodes.findMany()).toHaveLength(0)
  })

  it("register creates a user and stores the session user payload", async () => {
    const fakeSession = createFakeSession()

    await register({
      data: {
        bio: "fresh profile",
        email: "new-user@example.com",
        name: "New User",
      },
      session: fakeSession.session,
    })

    const user = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, "new-user@example.com"),
    })

    expect(user).toEqual(
      expect.objectContaining({
        bio: "fresh profile",
        email: "new-user@example.com",
        name: "New User",
      }),
    )
    expect(fakeSession.data.user).toEqual(
      expect.objectContaining({
        email: "new-user@example.com",
        id: user?.id,
        name: "New User",
      }),
    )
  })

  it("getSession returns flash once and clears it from stored session state", async () => {
    const fakeSession = createFakeSession({
      flash: {
        message: "saved",
        type: "success",
      },
      sidebarOpen: false,
      theme: "dark",
    })

    const sessionData = await getSession({
      session: fakeSession.session,
    })

    expect(sessionData).toEqual({
      flash: {
        message: "saved",
        type: "success",
      },
      sidebarOpen: false,
      theme: "dark",
    })
    expect(fakeSession.updates).toEqual([{ flash: undefined }])
    expect(fakeSession.data.flash).toBeUndefined()
  })

  it("clearSession clears session state", async () => {
    const fakeSession = createFakeSession({
      user: {
        avatarId: null,
        email: "clear@example.com",
        id: 42,
        name: "Clear User",
      },
    })

    await clearSession({
      session: fakeSession.session,
    })

    expect(fakeSession.cleared).toBe(true)
    expect(fakeSession.data).toEqual({})
  })

  it("sendAuthCode throws after 3 requests for the same email within the window", async () => {
    const email = "ratelimit@example.com"
    // Resend is mocked, so the first 3 sends succeed; the 4th must hit our
    // per-email rate limit.
    for (let i = 0; i < 3; i++) {
      await sendAuthCode({ data: { email } })
    }
    // The 4th must throw our rate-limit message
    await expect(sendAuthCode({ data: { email } })).rejects.toThrow(
      "Too many code requests. Please wait a few minutes.",
    )
  })

  it("sendAuthCode deletes an existing auth_code for the email before inserting a new one", async () => {
    const email = "dedup@example.com"
    const seededCode = "old-code"
    await db.insert(authCodes).values({
      code: seededCode,
      email,
      expiresAt: new Date(Date.now() + 60_000),
      id: nanoid(),
    })

    await sendAuthCode({ data: { email } })

    const remaining = await db.query.authCodes.findMany({
      where: (t, { eq }) => eq(t.email, email),
    })
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.code).not.toBe(seededCode)
  })
})
