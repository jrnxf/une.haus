import { db } from "~/db";
import { muxVideos } from "~/db/schema";
import { muxClient } from "~/lib/clients/mux";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { json } from "@tanstack/react-start";

export const APIRoute = createAPIFileRoute("/api/mux/webhook")({
  POST: async ({ request }) => {
    const rawBody = await request.text();
    const headers = request.headers;

    const event = muxClient.webhooks.unwrap(rawBody, headers);

    const { data, type } = event;

    console.log("MUX EVENT >>", type);

    if (type === "video.asset.ready") {
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id;
      const uploadId = data.upload_id;

      if (playbackId && uploadId) {
        const [video] = await db
          .insert(muxVideos)
          .values({
            assetId,
            playbackId,
            uploadId,
          })
          .onConflictDoUpdate({
            set: {
              assetId,
              playbackId,
            },
            target: muxVideos.uploadId,
          })
          .returning();

        console.log("Video asset ready", {
          video,
        });
      }
    }

    return json({ type: event.type });
  },
});
