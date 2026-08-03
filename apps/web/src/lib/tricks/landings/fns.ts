import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { listLandingsForUserSchema } from "./schemas"
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
