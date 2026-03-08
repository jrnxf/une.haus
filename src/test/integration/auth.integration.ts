import { beforeEach, describe, expect, it, mock } from "bun:test"

import { seedUser, truncatePublicTables } from "./helpers"
import { db } from "~/db"
import { authCodes } from "~/db/schema"
import { enterCodeImpl, registerImpl } from "~/lib/auth/fns"
import { clearSessionImpl, getSessionImpl } from "~/lib/session/fns"
import { type HausSession } from "~/lib/session/schema"

beforeEach(async () => {
  await truncatePublicTables()
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

    const result = await enterCodeImpl({
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

  it("enterCode rejects an expired code and deletes it", async () => {
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

    await expect(
      enterCodeImpl({
        data: { code: "2222" },
        session: fakeSession.session,
      }),
    ).rejects.toThrow("Code has expired")

    expect(fakeSession.updates).toHaveLength(0)
    expect(await db.query.authCodes.findMany()).toHaveLength(0)
  })

  it("enterCode rejects an invalid code without mutating session state", async () => {
    const fakeSession = createFakeSession()

    await expect(
      enterCodeImpl({
        data: { code: "9999" },
        session: fakeSession.session,
      }),
    ).rejects.toThrow("Invalid code")

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

    const result = await enterCodeImpl({
      data: { code: "3333" },
      session: fakeSession.session,
    })

    expect(result).toEqual({ status: "user_not_found" })
    expect(fakeSession.updates).toHaveLength(0)
    expect(await db.query.authCodes.findMany()).toHaveLength(0)
  })

  it("register creates a user and stores the session user payload", async () => {
    const fakeSession = createFakeSession()

    await registerImpl({
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

    const sessionData = await getSessionImpl({
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

  it("clearSession clears session state and removes the presence user", async () => {
    const fakeSession = createFakeSession({
      user: {
        avatarId: null,
        email: "clear@example.com",
        id: 42,
        name: "Clear User",
      },
    })
    const removePresenceUser = mock(() => {})

    await clearSessionImpl({
      removePresenceUser,
      session: fakeSession.session,
    })

    expect(removePresenceUser).toHaveBeenCalledWith(42)
    expect(fakeSession.cleared).toBe(true)
    expect(fakeSession.data).toEqual({})
  })
})
