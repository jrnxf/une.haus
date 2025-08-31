import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";

import { muxClient } from "~/lib/clients/mux";
import { useServerSession } from "~/lib/session/hooks";

export const ServerRoute = createServerFileRoute("/api/mux/url").methods({
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
