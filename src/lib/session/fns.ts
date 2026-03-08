import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { removeUser } from "~/lib/presence/state"
import { useServerSession } from "~/lib/session/hooks"
import {
  type HausSession,
  hausSessionSchema,
  setFlashSchema,
  setSidebarSchema,
  setThemeSchema,
} from "~/lib/session/schema"

type SessionStore = {
  clear: () => Promise<unknown>
  data: unknown
  update: (payload: Partial<HausSession>) => Promise<unknown>
}

export const getSessionServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<HausSession> => {
    const session = await useServerSession()
    return getSessionImpl({ session })
  },
)

export async function getSessionImpl({
  session,
}: {
  session: SessionStore
}): Promise<HausSession> {
  const parsedSession = hausSessionSchema.parse(session.data)

  // capture the flash
  const flash = parsedSession.flash

  if (flash) {
    await session.update({ flash: undefined })
  }

  const sessionData = {
    ...parsedSession,
    // return the flash
    flash,
  }

  return sessionData
}

export const setSessionFlashServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(setFlashSchema))
  .handler(async ({ data: input }) => {
    const session = await useServerSession()
    await session.update({ flash: input })
  })

export const clearSessionServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useServerSession()
    await clearSessionImpl({
      removePresenceUser: removeUser,
      session,
    })
  },
)

export async function clearSessionImpl({
  removePresenceUser,
  session,
}: {
  removePresenceUser: (userId: number) => void
  session: {
    clear: () => Promise<unknown>
    data: {
      user?: {
        id: number
      }
    }
  }
}) {
  if (session.data.user) {
    removePresenceUser(session.data.user.id)
  }

  await session.clear()
}

export const setSessionThemeServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(setThemeSchema))
  .handler(async ({ data: theme }) => {
    const session = await useServerSession()

    await session.update({
      ...session.data,
      theme,
    })
  })

export const setSessionSidebarServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(setSidebarSchema))
  .handler(async ({ data: sidebarOpen }) => {
    const session = await useServerSession()

    await session.update({
      ...session.data,
      sidebarOpen,
    })
  })
