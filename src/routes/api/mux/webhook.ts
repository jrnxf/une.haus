import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";

import { db } from "~/db";
import { muxVideos } from "~/db/schema";
import { muxClient } from "~/lib/clients/mux";

export const ServerRoute = createServerFileRoute("/api/mux/webhook").methods({
  POST: async ({ request }) => {
    const rawBody = await request.text();
    const headers = request.headers;

    const event = muxClient.webhooks.unwrap(rawBody, headers);

    const { data, type } = event;

    console.log(`[MUX EVENT] --> ${type}`);

    if (type === "video.asset.ready") {
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id;

      if (playbackId) {
        await db
          .insert(muxVideos)
          .values({ assetId, playbackId })
          .onConflictDoUpdate({
            target: muxVideos.assetId,
            set: { playbackId },
          })
          .returning();
      }
    }

    return json({ type });
  },
});
