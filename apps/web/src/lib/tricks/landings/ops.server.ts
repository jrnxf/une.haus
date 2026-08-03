import "@tanstack/react-start/server-only"
import { and, asc, countDistinct, eq, isNotNull, ne } from "drizzle-orm"

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
  utvVideoRiders,
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
  // Guard double-submits and re-linking the same vault video to one trick
  const existing = await db.query.trickVideos.findFirst({
    where: and(
      eq(trickVideos.trickId, data.trickId),
      eq(trickVideos.muxAssetId, data.muxAssetId),
      eq(trickVideos.submittedByUserId, context.user.id),
    ),
  })
  invariant(!existing, "Video already submitted for this trick")

  return submitVideo({
    context,
    data: {
      trickId: data.trickId,
      muxAssetId: data.muxAssetId,
      notes: data.notes ?? null,
    },
  })
}

export type VaultVideoOption = {
  utvVideoId: number
  title: string
  muxAssetId: string
  playbackId: string | null
  thumbnailSeconds: number
  durationSeconds: number | null
}

async function getMuxAssetDuration(assetId: string): Promise<number | null> {
  try {
    const { muxClient } = await import("~/lib/clients/mux")
    const asset = await muxClient.video.assets.retrieve(assetId)
    return asset.duration ?? null
  } catch {
    // Duration is display sugar — a mux hiccup must not break the picker
    return null
  }
}

// Vault videos the rider appears in that have playable mux footage — the
// candidates for linking as landing proof.
export async function vaultVideosForUser(
  userId: number,
  // Injectable so integration tests avoid the remote mux call
  getAssetDuration: (
    assetId: string,
  ) => Promise<number | null> = getMuxAssetDuration,
): Promise<VaultVideoOption[]> {
  const rows = await db
    .selectDistinct({
      utvVideoId: utvVideos.id,
      title: utvVideos.title,
      legacyTitle: utvVideos.legacyTitle,
      thumbnailSeconds: utvVideos.thumbnailSeconds,
      muxAssetId: muxVideos.assetId,
      playbackId: muxVideos.playbackId,
    })
    .from(utvVideoRiders)
    .innerJoin(utvVideos, eq(utvVideoRiders.utvVideoId, utvVideos.id))
    .innerJoin(muxVideos, eq(utvVideos.muxAssetId, muxVideos.assetId))
    .where(
      and(eq(utvVideoRiders.userId, userId), isNotNull(muxVideos.playbackId)),
    )
    .orderBy(asc(utvVideos.id))

  return Promise.all(
    rows.map(async (row) => ({
      utvVideoId: row.utvVideoId,
      title: row.title || row.legacyTitle,
      muxAssetId: row.muxAssetId,
      playbackId: row.playbackId,
      thumbnailSeconds: row.thumbnailSeconds,
      durationSeconds: await getAssetDuration(row.muxAssetId),
    })),
  )
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
