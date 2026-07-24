import { useQuery } from "@tanstack/react-query"

import { admin } from "~/lib/admin"
import { notifications } from "~/lib/notifications"
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks"

// shared by the desktop sidebar and mobile nav so both surfaces read the
// same unread/pending counters
export function useNavCounts() {
  const sessionUser = useSessionUser()
  const isAdmin = useIsAdmin()

  const { data: unreadCount = 0 } = useQuery({
    ...notifications.unreadCount.queryOptions(),
    enabled: Boolean(sessionUser),
  })

  const { data: adminPendingCount = 0 } = useQuery({
    ...admin.pendingCount.queryOptions(),
    enabled: Boolean(isAdmin),
  })

  return { unreadCount, adminPendingCount }
}
