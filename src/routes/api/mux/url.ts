import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

import { muxClient } from "~/server/clients/mux";
import { useServerSession } from "~/lib/session";

export const APIRoute = createAPIFileRoute("/api/mux/url")({
  GET: async () => {
    const session = await useServerSession();

    if (!session.data.user) {
      throw new Error("Unauthorized");
    }

    const upload = await muxClient.video.uploads.create({
      cors_origin: "*", // TODO set up cors
      new_asset_settings: {
        mp4_support: "standard",
        passthrough: JSON.stringify({ hello: "world" }),
        playback_policy: ["public"],
      },
    });

    return json(upload);
  },
});
