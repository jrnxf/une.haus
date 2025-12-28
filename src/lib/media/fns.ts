import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import { muxVideos } from "~/db/schema";
import { muxClient } from "~/lib/clients/mux";
import { client } from "~/lib/cloudflare";
import { sleep } from "~/lib/dx/utils";
import { env } from "~/lib/env";
import { assertFound, invariant } from "~/lib/invariant";
import { useServerSession } from "~/lib/session/hooks";
import { isDefined } from "~/lib/utils";

export const createCloudflareImagesDirectUploadServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  return await client.images.v2.directUploads.create({
    account_id: env.CLOUDFLARE_ACCOUNT_ID,
  });
});

export const createPresignedMuxUrlServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession();

  invariant(session.data.user, "Unauthorized");

  const upload = await muxClient.video.uploads.create({
    cors_origin: "*", // TODO set up cors
    new_asset_settings: {
      mp4_support: "capped-1080p",
      playback_policy: ["public"],
    },
  });

  return upload;
});

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
  .handler(async ({ data: input }) => {
    const session = await useServerSession();

    invariant(session.data.user, "Unauthorized");

    const MAX_TRIES = 50;
    const SLEEP_INTERVAL_MS = 750;

    // Poll Mux for asset ID creation
    let assetId: string | undefined;
    let tries = 0;

    while (!assetId && tries < MAX_TRIES) {
      const upload = await muxClient.video.uploads.retrieve(input.uploadId);
      assetId = upload.asset_id;

      if (!assetId) {
        console.log(
          `Waiting for asset id another ${SLEEP_INTERVAL_MS}ms for uploadId ${input.uploadId}. ${MAX_TRIES - tries - 1} tries left.`,
        );
        await sleep(SLEEP_INTERVAL_MS);
      }

      tries++;
    }

    invariant(
      assetId,
      `Asset id not found for uploadId ${input.uploadId} after ${MAX_TRIES} tries and sleep interval of ${SLEEP_INTERVAL_MS}ms`,
    );

    // now that we have the asset id we know what to poll the backend for

    // Poll database for playback ID (set by webhook when video is ready)
    tries = 0;

    while (tries < MAX_TRIES) {
      const video = await db.query.muxVideos.findFirst({
        where: eq(muxVideos.assetId, assetId),
      });

      const playbackId = video?.playbackId;
      if (video && isDefined(playbackId)) {
        return {
          ...video,
          playbackId,
        };
      }

      console.log(`Polling ${assetId}: ${MAX_TRIES - tries - 1} left`);
      await sleep(SLEEP_INTERVAL_MS);
      tries++;
    }

    throw new Error(
      `Playback id not found for assetId ${assetId} after ${MAX_TRIES} tries and sleep interval of ${SLEEP_INTERVAL_MS}ms`,
    );
  });

export const getMuxVideoServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    zodValidator(
      z.object({
        assetId: z.string(),
      }),
    ),
  )
  .handler(async ({ data: input }) => {
    const video = await db.query.muxVideos.findFirst({
      where: eq(muxVideos.assetId, input.assetId),
    });

    assertFound(video);

    return video;
  });
