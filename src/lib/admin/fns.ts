import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"

import { adminOnlyMiddleware } from "~/lib/middleware"

const loadAdminOps = createServerOnlyFn(() => import("~/lib/admin/ops.server"))

export const getPendingCountServerFn = createServerFn({
  method: "GET",
})
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const { getPendingCount } = await loadAdminOps()
    return getPendingCount()
  })
