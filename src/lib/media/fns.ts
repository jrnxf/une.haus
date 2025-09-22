import { createServerFn } from "@tanstack/react-start";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import { muxVideos } from "~/db/schema";
import { muxClient } from "~/lib/clients/mux";
import { s3Client } from "~/lib/clients/s3";
import { sleep } from "~/lib/dx/utils";
import { env } from "~/lib/env";
import { assertFound, invariant } from "~/lib/invariant";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";
import { useServerSession } from "~/lib/session/hooks";

export const createPresignedS3UrlServerFn = createServerFn({
  method: "POST",
})
  .validator(createPresignedS3UrlSchema)
  .handler(async ({ data: input }) => {
    const key = `${input.prefix}/${Date.now()}__${input.fileName}`;

    const command = new PutObjectCommand({
      Bucket: env.HAUS_AWS_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5, // 5 minutes
    });

    return url;
  });

export const createPresignedMuxUrlServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useServerSession();

  invariant(session.data.user, "Unauthorized");

  const upload = await muxClient.video.uploads.create({
    cors_origin: "*", // TODO set up cors
    new_asset_settings: {
      mp4_support: "standard",
      playback_policy: ["public"],
    },
  });

  return upload;
});

export const getMuxVideoUploadStatusServerFn = createServerFn({
  method: "GET",
})
  .validator(
    z.object({
      uploadId: z.string(),
    }),
  )
  .handler(async ({ data: input }) => {
    const session = await useServerSession();

    invariant(session.data.user, "Unauthorized");

    const upload = await muxClient.video.uploads.retrieve(input.uploadId);

    return upload;
  });

export const getMuxVideoServerFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      assetId: z.string(),
    }),
  )
  .handler(async ({ data: input }) => {
    const video = await db.query.muxVideos.findFirst({
      where: eq(muxVideos.assetId, input.assetId),
    });

    assertFound(video);

    return video;
  });
