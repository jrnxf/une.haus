import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { useServerSession } from "~/lib/session/hooks"
import { clearSession, getSession } from "~/lib/session/ops"
import {
  setFlashSchema,
  setSidebarSchema,
  setThemeSchema,
} from "~/lib/session/schema"

export const getSessionServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useServerSession()
    return getSession({ session })
  },
)

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
    await clearSession({ session })
  },
)

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
