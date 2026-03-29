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

  const d = data as Record<string, unknown>
  const playbackIds = d.playback_ids as Array<{ id: string }> | undefined
  const eventMeta = {
    type,
    assetId: d.asset_id ?? d.id,
    uploadId:
      d.upload_id ?? (type === "video.upload.asset_created" ? d.id : undefined),
    playbackId: playbackIds?.[0]?.id,
    status: d.status,
  }

  console.log("[MUX EVENT]", eventMeta)

  Sentry.addBreadcrumb({
    category: "mux.webhook",
    message: type,
    level: "info",
    data: eventMeta,
  })

  if (type === "video.upload.asset_created") {
    const { asset_id: assetId, id: uploadId } = data

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
