import * as Sentry from "@sentry/tanstackstart-react"
import { defineEventHandler, getRequestHeaders, readRawBody } from "h3"

import { muxClient } from "~/lib/clients/mux"
import {
  handleAssetReady,
  handleUploadAssetCreated,
} from "~/lib/media/ops.server"

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event)

  if (!rawBody) {
    return new Response("Missing request body", { status: 400 })
  }

  const headers = getRequestHeaders(event)
  const muxEvent = muxClient.webhooks.unwrap(rawBody, headers)
  const { data, type } = muxEvent

  console.log(`[MUX EVENT] --> ${type}`)

  Sentry.addBreadcrumb({
    category: "mux.webhook",
    message: type,
    level: "info",
    data: { type, payload: data },
  })

  Sentry.captureMessage(`[mux webhook] ${type}`, {
    level: "info",
    extra: { type, payload: data },
  })

  if (type === "video.upload.asset_created") {
    const assetId = data.asset_id
    const uploadId = data.id

    if (assetId && uploadId) {
      await handleUploadAssetCreated({ assetId, uploadId })
    }
  }

  if (type === "video.asset.ready") {
    const assetId = data.id
    const playbackId = data.playback_ids?.[0]?.id

    if (assetId && playbackId) {
      await handleAssetReady({ assetId, playbackId })
    }
  }

  return { type }
})
