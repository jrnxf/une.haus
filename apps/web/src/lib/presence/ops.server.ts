import { getRequestHeader } from "@tanstack/react-start/server"
import { and, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm"

import { db } from "~/db"
import { presence, users } from "~/db/schema"
import { useServerSession } from "~/lib/session/hooks"

// Must be > poll interval (15s) to avoid flicker between polls.
// 2x gives one missed poll of grace before a user drops off.
export const ONLINE_THRESHOLD_MS = 30 * 1000

// Presence rows key anonymous visitors by a hash of their IP — the raw
// address never lands in the database.
async function hashIp(ip: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  )
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("")
}

async function touchSubject(subject: string, userId: number | null) {
  await db
    .insert(presence)
    .values({ subject, userId, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: presence.subject,
      set: { lastSeenAt: new Date() },
    })
}

export async function getOnlineUsers() {
  const session = await useServerSession()
  const ip =
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    getRequestHeader("x-real-ip") ??
    "unknown"

  const anonSubject = `anon:${await hashIp(ip)}`

  if (session.data.user) {
    const userId = session.data.user.id
    await touchSubject(`user:${userId}`, userId)
    await db.delete(presence).where(eq(presence.subject, anonSubject))
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, userId))
  } else {
    await touchSubject(anonSubject, null)
  }

  const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS)

  // Lazy prune: presence rows are ephemeral by design; anything stale is
  // garbage the next poll can clear.
  await db.delete(presence).where(lt(presence.lastSeenAt, cutoff))

  const onlineUserDetails = await db
    .select({
      id: users.id,
      name: users.name,
      avatarId: users.avatarId,
    })
    .from(presence)
    .innerJoin(users, eq(users.id, presence.userId))
    .where(and(isNotNull(presence.userId), gt(presence.lastSeenAt, cutoff)))

  const [guestRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(presence)
    .where(and(isNull(presence.userId), gt(presence.lastSeenAt, cutoff)))

  const guests = guestRow?.count ?? 0

  return {
    users: onlineUserDetails,
    guests,
    total: onlineUserDetails.length + guests,
  }
}
