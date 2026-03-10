import { createServerFn } from "@tanstack/react-start"

import { getContributors, getStats } from "~/lib/stats/ops.server"

export const getStatsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return getStats()
})

export const getContributorsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return getContributors()
})
