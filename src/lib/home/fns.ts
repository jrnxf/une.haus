import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"

const loadHomeOps = createServerOnlyFn(() => import("~/lib/home/ops.server"))

export const getHomeBoardServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getHomeBoard } = await loadHomeOps()
    return getHomeBoard()
  },
)
