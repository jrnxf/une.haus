import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { flagContentSchema, resolveFlagSchema } from "./schemas"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"

const loadFlagOps = createServerOnlyFn(() => import("~/lib/flags/ops.server"))

export const flagContentServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(flagContentSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { flagContent } = await loadFlagOps()
    return flagContent(ctx)
  })

export const resolveFlagServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(resolveFlagSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { resolveFlag } = await loadFlagOps()
    return resolveFlag(ctx)
  })

export const listFlagsServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const { listFlags } = await loadFlagOps()
    return listFlags()
  })
