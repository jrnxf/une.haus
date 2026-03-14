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

export async function getOnlineUsers() {
  const session = await useServerSession()
  const ip =
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getRequestHeader("x-real-ip") ??
    "unknown"

  if (session.data.user) {
    registerUser(session.data.user.id)
    removeAnonymous(ip)
  } else {
    registerAnonymous(ip)
  }

  if (session.data.user) {
    await db
      .update(users)
      .set({ lastSeenAt: sql`now()` })
      .where(sql`${users.id} = ${session.data.user.id}`)
  }

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
}
