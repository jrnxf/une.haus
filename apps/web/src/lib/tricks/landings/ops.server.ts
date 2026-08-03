import "@tanstack/react-start/server-only"
import { and, asc, countDistinct, eq, ne } from "drizzle-orm"

import { db } from "~/db"
import { trickVideos } from "~/db/schema"

// A landing is derived, not stored: any non-rejected trickVideos row by the
// user for a trick means they've landed it. "pending" counts immediately so
// review never blocks the checklist loop; "rejected" revokes the landing.
export type Landing = {
  trickId: number
  status: "active" | "pending"
  videoIds: number[]
  firstLandedAt: Date
}

export async function landingsForUser(userId: number): Promise<Landing[]> {
  const rows = await db.query.trickVideos.findMany({
    where: and(
      eq(trickVideos.submittedByUserId, userId),
      ne(trickVideos.status, "rejected"),
    ),
    columns: {
      id: true,
      trickId: true,
      status: true,
      createdAt: true,
    },
    orderBy: [asc(trickVideos.createdAt)],
  })

  // Reduce to one landing per trick: "active" wins over "pending", videoIds
  // keeps every proof, firstLandedAt is the earliest submission.
  const byTrick = new Map<number, Landing>()
  for (const row of rows) {
    const existing = byTrick.get(row.trickId)
    if (existing) {
      existing.videoIds.push(row.id)
      if (row.status === "active") existing.status = "active"
    } else {
      byTrick.set(row.trickId, {
        trickId: row.trickId,
        status: row.status === "active" ? "active" : "pending",
        videoIds: [row.id],
        firstLandedAt: row.createdAt,
      })
    }
  }

  return [...byTrick.values()]
}

export async function landingCounts(): Promise<
  { trickId: number; riders: number }[]
> {
  return db
    .select({
      trickId: trickVideos.trickId,
      riders: countDistinct(trickVideos.submittedByUserId),
    })
    .from(trickVideos)
    .where(ne(trickVideos.status, "rejected"))
    .groupBy(trickVideos.trickId)
}
