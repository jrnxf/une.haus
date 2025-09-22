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

    console.log(`--> MUX EVENT --> ${type}`);

    if (type === "video.asset.ready") {
      console.dir(data, { depth: null });
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id;

      console.log("assetId", assetId);
      console.log("playbackId", playbackId);

      if (playbackId) {
        const [video] = await db
          .insert(muxVideos)
          .values({
            assetId,
            playbackId,
          })
          .onConflictDoUpdate({
            set: { playbackId },
            target: muxVideos.assetId,
          })
          .returning();

        console.log("Video asset ready", { video });
      }
    }

    return json({ type: event.type });
  },
});
