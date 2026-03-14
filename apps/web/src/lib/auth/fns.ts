import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  enterCodeSchema,
  registerSchema,
  sendCodeSchema,
} from "~/lib/auth/schemas"
import { useServerSession } from "~/lib/session/hooks"

const loadAuthOps = createServerOnlyFn(() => import("~/lib/auth/ops.server"))

export const sendAuthCodeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(sendCodeSchema))
  .handler(async (ctx) => {
    const { sendAuthCode } = await loadAuthOps()
    return sendAuthCode(ctx)
  })

export const enterCodeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(enterCodeSchema)
  .handler(async ({ data: input }) => {
    const session = await useServerSession()
    const { enterCode } = await loadAuthOps()
    return enterCode({ data: input, session })
  })

export const registerServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(registerSchema))
  .handler(async ({ data: input }) => {
    const session = await useServerSession()
    const { register } = await loadAuthOps()
    await register({ data: input, session })
  })
