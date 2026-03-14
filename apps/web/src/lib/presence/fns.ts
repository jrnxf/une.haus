import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"

const loadPresenceOps = createServerOnlyFn(
  () => import("~/lib/presence/ops.server"),
)

export const getOnlineUsersServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { getOnlineUsers } = await loadPresenceOps()
  return getOnlineUsers()
})
