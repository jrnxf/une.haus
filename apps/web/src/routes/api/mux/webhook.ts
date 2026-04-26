import * as Sentry from "@sentry/cloudflare"
import { createFileRoute } from "@tanstack/react-router"

import { muxClient } from "~/lib/clients/mux"
import {
  handleAssetReady,
  handleUploadAssetCreated,
} from "~/lib/media/ops.server"

export const Route = createFileRoute("/api/mux/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text()

        if (!rawBody) {
          return new Response("Missing request body", { status: 400 })
        }

        // Mux SDK expects a plain Record<string, string> — convert from Web Headers
        const headers: Record<string, string> = {}
        request.headers.forEach((value, key) => {
          headers[key] = value
        })

        const muxEvent = muxClient.webhooks.unwrap(rawBody, headers)
        const { data, type } = muxEvent

        const d = data as Record<string, unknown>
        const playbackIds = d.playback_ids as Array<{ id: string }> | undefined
        const eventMeta = {
          type,
          assetId: d.asset_id ?? d.id,
          uploadId:
            d.upload_id ??
            (type === "video.upload.asset_created" ? d.id : undefined),
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

        return Response.json({ type })
      },
    },
  },
})
