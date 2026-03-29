import { redirect } from "@tanstack/react-router"
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { z } from "zod"

import { muxClient } from "~/lib/clients/mux"
import { client } from "~/lib/cloudflare"
import { env } from "~/lib/env"
import { useServerSession } from "~/lib/session/hooks"

const loadMediaOps = createServerOnlyFn(() => import("~/lib/media/ops.server"))

export const createCloudflareImagesDirectUploadServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession()

  if (!session.data.user) throw redirect({ to: "/auth" })

  return await client.images.v2.directUploads.create({
    account_id: env.CLOUDFLARE_ACCOUNT_ID,
  })
})

export const createPresignedMuxUrlServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession()

  if (!session.data.user) throw redirect({ to: "/auth" })

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
  .handler(async (ctx) => {
    const session = await useServerSession()

    if (!session.data.user) throw redirect({ to: "/auth" })

    const { pollMuxVideoUploadStatus } = await loadMediaOps()
    return pollMuxVideoUploadStatus(ctx)
  })
