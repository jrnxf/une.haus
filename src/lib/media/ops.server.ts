import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"

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
import { sleep } from "~/lib/dx/utils"
import { assertFound } from "~/lib/invariant"
import { logger } from "~/lib/logger"

export async function handleUploadAssetCreated({
  assetId,
  uploadId,
}: {
  assetId: string
  uploadId: string
}) {
  await db.insert(muxVideos).values({ assetId, uploadId }).onConflictDoUpdate({
    target: muxVideos.assetId,
    set: { uploadId },
  })
}

export async function handleAssetReady({
  assetId,
  playbackId,
}: {
  assetId: string
  playbackId: string
}) {
  await db
    .insert(muxVideos)
    .values({ assetId, playbackId })
    .onConflictDoUpdate({
      target: muxVideos.assetId,
      set: { playbackId },
    })
}

export async function pollMuxVideoUploadStatus({
  data: input,
}: {
  data: {
    uploadId: string
  }
}) {
  const maxTries = 60
  const sleepIntervalMs = 1000
  let tries = 0

  while (tries < maxTries) {
    const video = await db.query.muxVideos.findFirst({
      where: eq(muxVideos.uploadId, input.uploadId),
    })

    if (video?.playbackId) {
      return {
        assetId: video.assetId,
        playbackId: video.playbackId,
      }
    }

    logger.debug("polling for mux upload", {
      uploadId: input.uploadId,
      triesLeft: maxTries - tries - 1,
    })
    await sleep(sleepIntervalMs)
    tries++
  }

  throw new Error(
    `Video not ready for uploadId ${input.uploadId} after ${maxTries} tries`,
  )
}

// How many rows across the app reference a mux asset. Deletion paths must not
// destroy an asset that another surface still points at.
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

/**
 * Destroy a mux asset (remote + local row) unless something still references
 * it. Returns whether the asset was destroyed. `deleteRemoteAsset` is
 * injectable so integration tests can observe/skip the remote mux call.
 */
export async function deleteMuxAssetIfUnreferenced(
  assetId: string,
  deleteRemoteAsset: (assetId: string) => Promise<void> = deleteRemoteMuxAsset,
): Promise<boolean> {
  if ((await muxAssetReferenceCount(assetId)) > 0) return false

  // Best-effort: a failed remote delete leaks an orphaned mux asset but must
  // not block local cleanup.
  try {
    await deleteRemoteAsset(assetId)
  } catch (error) {
    console.error(`failed to delete mux asset ${assetId}`, error)
  }
  await db.delete(muxVideos).where(eq(muxVideos.assetId, assetId))
  return true
}

export async function getMuxVideo({
  data: input,
}: {
  data: {
    assetId: string
  }
}) {
  const video = await db.query.muxVideos.findFirst({
    where: eq(muxVideos.assetId, input.assetId),
  })

  assertFound(video)

  return video
}
