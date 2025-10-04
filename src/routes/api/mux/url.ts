import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";

import { muxClient } from "~/lib/clients/mux";
import { invariant } from "~/lib/invariant";
import { useServerSession } from "~/lib/session/hooks";

export const Route = createFileRoute("/api/mux/url")({
  server: {
    handlers: {
      GET: async () => {
        const session = await useServerSession();

        invariant(session.data.user, "Unauthorized");

        const upload = await muxClient.video.uploads.create({
          cors_origin: "*", // TODO set up cors
          new_asset_settings: {
            mp4_support: "capped-1080p",
            passthrough: JSON.stringify({ hello: "world" }),
            playback_policy: ["public"],
          },
        });

        return json(upload);
      },
    },
  },
});
