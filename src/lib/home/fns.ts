import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"

const loadHomeOps = createServerOnlyFn(() => import("~/lib/home/ops.server"))

export const getHomeLatestServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { getHomeLatest } = await loadHomeOps()
  return getHomeLatest()
})
