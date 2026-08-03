import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  landTrickSchema,
  listLandingsForUserSchema,
  unlandTrickSchema,
} from "./schemas"
import { authMiddleware } from "~/lib/middleware"

const loadLandingOps = createServerOnlyFn(() => import("./ops.server"))

export const listMyLandingsServerFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { landingsForUser } = await loadLandingOps()
    return landingsForUser(context.user.id)
  })

export const listLandingsForUserServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listLandingsForUserSchema))
  .handler(async ({ data }) => {
    const { landingsForUser } = await loadLandingOps()
    return landingsForUser(data.userId)
  })

export const getLandingCountsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { landingCounts } = await loadLandingOps()
  return landingCounts()
})

export const listVaultVideosForLandingServerFn = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { vaultVideosForUser } = await loadLandingOps()
    return vaultVideosForUser(context.user.id)
  })

export const landTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(landTrickSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { landTrick } = await loadLandingOps()
    return landTrick(ctx)
  })

export const unlandTrickServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(unlandTrickSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { unlandTrick } = await loadLandingOps()
    return unlandTrick(ctx)
  })
