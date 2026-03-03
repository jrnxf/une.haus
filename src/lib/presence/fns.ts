import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import { inArray, sql } from "drizzle-orm"

import { db } from "~/db"
import { users } from "~/db/schema"
import {
  getOnlineUserIds,
  guestCount,
  registerAnonymous,
  registerUser,
  removeAnonymous,
} from "~/lib/presence/state"
import { useServerSession } from "~/lib/session/hooks"

// Single server function that acts as both heartbeat and query.
// Every poll registers the caller's presence, then returns the online list.
// This means the SSR call in the root loader includes the current visitor
// on first paint — no separate heartbeat needed.
export const getOnlineUsersServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const session = await useServerSession()
  const ip =
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getRequestHeader("x-real-ip") ??
    "unknown"

  if (session.data.user) {
    registerUser(session.data.user.id)
    // Remove IP from anonymous map to handle login transition
    removeAnonymous(ip)
  } else {
    registerAnonymous(ip)
  }

  // Update last_seen_at as historical data (not used for online status)
  if (session.data.user) {
    await db
      .update(users)
      .set({ lastSeenAt: sql`now()` })
      .where(sql`${users.id} = ${session.data.user.id}`)
  }

  // Fetch user details for currently online users
  const onlineUserIds = getOnlineUserIds()
  const onlineUserDetails =
    onlineUserIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            avatarId: users.avatarId,
          })
          .from(users)
          .where(inArray(users.id, onlineUserIds))
      : []

  const guests = guestCount()

  return {
    users: onlineUserDetails,
    guests,
    total: onlineUserDetails.length + guests,
  }
})
