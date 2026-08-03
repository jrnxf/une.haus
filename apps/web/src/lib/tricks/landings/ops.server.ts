import "@tanstack/react-start/server-only"
import { and, asc, countDistinct, eq, ne } from "drizzle-orm"

import { type LandTrickArgs, type UnlandTrickArgs } from "./schemas"
import { db } from "~/db"
import {
  biuSets,
  muxVideos,
  posts,
  riuSets,
  riuSubmissions,
  siuSets,
  trickVideos,
  utvVideos,
} from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { submitVideo } from "~/lib/tricks/videos/ops.server"

type AuthenticatedContext = {
  user: {
    avatarId: string | null
    id: number
    name: string
  }
}

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

export async function landTrick({
  data,
  context,
}: {
  context: AuthenticatedContext
  data: LandTrickArgs
}) {
  return submitVideo({
    context,
    data: {
      trickId: data.trickId,
      muxAssetId: data.muxAssetId,
      notes: data.notes ?? null,
    },
  })
}

// How many rows across the app still reference a mux asset. Un-land must not
// destroy an asset that another surface (vault, posts, game sets, another
// trick video) still points at.
async function muxAssetReferenceCount(assetId: string): Promise<number> {
  const counts = await Promise.all([
    db.$count(posts, eq(posts.muxAssetId, assetId)),
    db.$count(utvVideos, eq(utvVideos.muxAssetId, assetId)),
    db.$count(riuSets, eq(riuSets.muxAssetId, assetId)),
    db.$count(riuSubmissions, eq(riuSubmissions.muxAssetId, assetId)),
    db.$count(biuSets, eq(biuSets.muxAssetId, assetId)),
    db.$count(siuSets, eq(siuSets.muxAssetId, assetId)),
    db.$count(trickVideos, eq(trickVideos.muxAssetId, assetId)),
  ])
  return counts.reduce((total, count) => total + count, 0)
}

async function deleteRemoteMuxAsset(assetId: string) {
  const { muxClient } = await import("~/lib/clients/mux")
  await muxClient.video.assets.delete(assetId)
}

export async function unlandTrick({
  data,
  context,
  deleteRemoteAsset = deleteRemoteMuxAsset,
}: {
  context: AuthenticatedContext
  data: UnlandTrickArgs
  // Injectable so integration tests can observe/skip the remote mux call
  deleteRemoteAsset?: (assetId: string) => Promise<void>
}) {
  const rows = await db.query.trickVideos.findMany({
    where: and(
      eq(trickVideos.trickId, data.trickId),
      eq(trickVideos.submittedByUserId, context.user.id),
      ne(trickVideos.status, "rejected"),
    ),
  })

  invariant(rows.length > 0, "No landing to remove")

  for (const row of rows) {
    await db.delete(trickVideos).where(eq(trickVideos.id, row.id))

    // A direct-upload asset with no other references dies with the landing;
    // a shared asset (e.g. vault-linked) keeps living — only the row dies.
    const stillReferenced = (await muxAssetReferenceCount(row.muxAssetId)) > 0
    if (stillReferenced) continue

    // Best-effort: a failed remote delete leaks an orphaned mux asset but must
    // not resurrect the landing, which is already gone.
    try {
      await deleteRemoteAsset(row.muxAssetId)
    } catch (error) {
      console.error(`failed to delete mux asset ${row.muxAssetId}`, error)
    }
    await db.delete(muxVideos).where(eq(muxVideos.assetId, row.muxAssetId))
  }

  return { removed: rows.length }
}
