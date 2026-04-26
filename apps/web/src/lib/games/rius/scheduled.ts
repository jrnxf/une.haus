import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"

import { db } from "~/db"
import { rius } from "~/db/schema"

export async function rotateRius() {
  console.log("[rius:rotate] Starting RIU rotation...")

  const archivedResult = await db
    .update(rius)
    .set({ status: "archived" })
    .where(eq(rius.status, "active"))
    .returning()

  console.log(`[rius:rotate] Archived ${archivedResult.length} active RIU(s)`)

  const activatedResult = await db
    .update(rius)
    .set({ status: "active" })
    .where(eq(rius.status, "upcoming"))
    .returning()

  console.log(
    `[rius:rotate] Activated ${activatedResult.length} upcoming RIU(s)`,
  )

  const [newRiu] = await db
    .insert(rius)
    .values({ status: "upcoming" })
    .returning()

  console.log(`[rius:rotate] Created new upcoming RIU with id: ${newRiu.id}`)

  return {
    success: true,
    archived: archivedResult.length,
    activated: activatedResult.length,
    newRiuId: newRiu.id,
  }
}
