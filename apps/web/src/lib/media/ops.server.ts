import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"

import { db } from "~/db"
import { muxVideos } from "~/db/schema"
import { sleep } from "~/lib/dx/utils"
import { assertFound } from "~/lib/invariant"

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

    console.log(
      `Polling DB for uploadId ${input.uploadId}: ${maxTries - tries - 1} tries left`,
    )
    await sleep(sleepIntervalMs)
    tries++
  }

  throw new Error(
    `Video not ready for uploadId ${input.uploadId} after ${maxTries} tries`,
  )
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
