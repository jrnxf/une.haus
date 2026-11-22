import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { insightsSchema } from "~/lib/insights/schemas"
import { adminOnlyMiddleware } from "~/lib/middleware"

const loadOps = createServerOnlyFn(() => import("~/lib/insights/ops.server"))

export const getOverviewServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(insightsSchema))
  .handler(async ({ data }) => (await loadOps()).getOverview(data))

export const getAskInsightsServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(insightsSchema))
  .handler(async ({ data }) => (await loadOps()).getAskInsights(data))

export const getMemberInsightsServerFn = createServerFn({ method: "GET" })
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(insightsSchema))
  .handler(async ({ data }) => (await loadOps()).getMemberInsights(data))
