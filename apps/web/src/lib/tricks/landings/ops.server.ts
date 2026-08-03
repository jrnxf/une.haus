import "@tanstack/react-start/server-only"
import { and, asc, countDistinct, eq, isNotNull, ne } from "drizzle-orm"

import { type LandTrickArgs, type UnlandTrickArgs } from "./schemas"
import { db } from "~/db"
import { muxVideos, trickVideos, utvVideoRiders, utvVideos } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { deleteMuxAssetIfUnreferenced } from "~/lib/media/ops.server"
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

export async function unlandTrick({
  data,
  context,
  deleteRemoteAsset,
}: {
  context: AuthenticatedContext
  data: UnlandTrickArgs
  // Injectable so integration tests can observe/skip the remote mux call
  deleteRemoteAsset?: (assetId: string) => Promise<void>
}) {
  const rows = await db
    .delete(trickVideos)
    .where(
      and(
        eq(trickVideos.trickId, data.trickId),
        eq(trickVideos.submittedByUserId, context.user.id),
        ne(trickVideos.status, "rejected"),
      ),
    )
    .returning({ muxAssetId: trickVideos.muxAssetId })

  invariant(rows.length > 0, "No landing to remove")

  // A direct-upload asset with no other references dies with the landing; a
  // shared asset (e.g. vault-linked) keeps living — only the row dies.
  const assetIds = [...new Set(rows.map((row) => row.muxAssetId))]
  await Promise.all(
    assetIds.map((assetId) =>
      deleteMuxAssetIfUnreferenced(assetId, deleteRemoteAsset),
    ),
  )

  return { removed: rows.length }
}
