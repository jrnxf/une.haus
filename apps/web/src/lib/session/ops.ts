import { type HausSession, hausSessionSchema } from "~/lib/session/schema"

type SessionStore = {
  clear: () => Promise<unknown>
  data: unknown
  update: (payload: Partial<HausSession>) => Promise<unknown>
}

export async function getSession({
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

export async function clearSession({
  session,
}: {
  session: {
    clear: () => Promise<unknown>
  }
}) {
  await session.clear()
}
