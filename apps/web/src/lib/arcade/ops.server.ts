import "@tanstack/react-start/server-only"
import { eq, sql } from "drizzle-orm"

import { db } from "~/db"
import { users } from "~/db/schema"

export async function getHighScore(userId: number) {
  const [row] = await db
    .select({ arcadeHighScore: users.arcadeHighScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return row?.arcadeHighScore ?? 0
}

export async function saveHighScore({
  context,
  data,
}: {
  context: { user: { id: number } }
  data: { score: number }
}) {
  await db
    .update(users)
    .set({
      arcadeHighScore: sql`greatest(${users.arcadeHighScore}, ${data.score})`,
    })
    .where(eq(users.id, context.user.id))
}
