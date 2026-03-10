import "@tanstack/react-start/server-only"
import { sql } from "drizzle-orm"

import { db } from "~/db"
import { users } from "~/db/schema"

export async function touchLastSeen(userId: number) {
  await db
    .update(users)
    .set({ lastSeenAt: sql`now()` })
    .where(sql`${users.id} = ${userId}`)
}
