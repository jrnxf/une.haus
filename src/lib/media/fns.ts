import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "~/db"
import { muxVideos } from "~/db/schema"
import { muxClient } from "~/lib/clients/mux"
import { client } from "~/lib/cloudflare"
import { sleep } from "~/lib/dx/utils"
import { env } from "~/lib/env"
import { assertFound, invariant } from "~/lib/invariant"
import { useServerSession } from "~/lib/session/hooks"

export const createCloudflareImagesDirectUploadServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession()

  invariant(session.data.user, "Unauthorized")

  return await client.images.v2.directUploads.create({
    account_id: env.CLOUDFLARE_ACCOUNT_ID,
  })
})

export const createPresignedMuxUrlServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession()

  invariant(session.data.user, "Unauthorized")

  const upload = await muxClient.video.uploads.create({
    cors_origin: "https://une.haus",
    new_asset_settings: {
      mp4_support: "capped-1080p",
      playback_policy: ["public"],
    },
  })

  return upload
})

export const pollMuxVideoUploadStatusServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    zodValidator(
      z.object({
        uploadId: z.string(),
      }),
    ),
  )
  .handler(async ({ data: input }) => {
    const session = await useServerSession()

    invariant(session.data.user, "Unauthorized")

    const MAX_TRIES = 60
    const SLEEP_INTERVAL_MS = 1000

    // Poll database for video readiness
    // 1. video.upload.asset_created webhook inserts muxVideos row with uploadId + assetId
    // 2. video.asset.ready webhook updates the row with playbackId
    let tries = 0

    while (tries < MAX_TRIES) {
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
        `Polling DB for uploadId ${input.uploadId}: ${MAX_TRIES - tries - 1} tries left`,
      )
      await sleep(SLEEP_INTERVAL_MS)
      tries++
    }

    throw new Error(
      `Video not ready for uploadId ${input.uploadId} after ${MAX_TRIES} tries`,
    )
  })

export const getMuxVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    zodValidator(
      z.object({
        assetId: z.string(),
      }),
    ),
  )
  .handler(async ({ data: input }) => {
    const video = await db.query.muxVideos.findFirst({
      where: eq(muxVideos.assetId, input.assetId),
    })

    assertFound(video)

    return video
  })
