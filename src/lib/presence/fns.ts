import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"

import { useServerSession } from "~/lib/session/hooks"

const loadPresenceOps = createServerOnlyFn(
  () => import("~/lib/presence/ops.server"),
)

/**
 * Updates last_seen_at as historical data.
 * Called on visibility change or periodically if needed.
 */
export const touchLastSeenServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession()
  if (session.data.user) {
    const { touchLastSeen } = await loadPresenceOps()
    await touchLastSeen(session.data.user.id)
  }
})
