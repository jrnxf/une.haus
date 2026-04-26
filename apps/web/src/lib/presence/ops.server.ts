import "@tanstack/react-start/server-only"
import { gt, sql } from "drizzle-orm"

import { db } from "~/db"
import { users } from "~/db/schema"
import { useServerSession } from "~/lib/session/hooks"

// Must be > poll interval (15s) to avoid flicker between polls.
// 2x gives one missed poll of grace before a user drops off.
const ONLINE_THRESHOLD_MS = 30 * 1000

export async function getOnlineUsers() {
  const session = await useServerSession()

  if (session.data.user) {
    await db
      .update(users)
      .set({ lastSeenAt: sql`now()` })
      .where(sql`${users.id} = ${session.data.user.id}`)
  }

  const onlineUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarId: users.avatarId,
    })
    .from(users)
    .where(
      gt(
        users.lastSeenAt,
        sql`now() - interval '${sql.raw(String(ONLINE_THRESHOLD_MS / 1000))} seconds'`,
      ),
    )

  return {
    users: onlineUsers,
    // Guest tracking required in-process state; not available on Workers.
    // Re-introduce via Durable Object or KV when product needs it.
    guests: 0,
    total: onlineUsers.length,
  }
}
