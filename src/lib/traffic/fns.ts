import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { insightsSchema } from "~/lib/insights/schemas"
import { adminOnlyMiddleware } from "~/lib/middleware"

const loadOps = createServerOnlyFn(() => import("~/lib/traffic/ops.server"))

export const getTrafficServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(insightsSchema))
  .handler(async ({ data }) => (await loadOps()).getTraffic(data))
