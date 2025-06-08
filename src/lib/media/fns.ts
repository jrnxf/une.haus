import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "~/db";
import { muxVideos } from "~/db/schema";
import { s3Client } from "~/lib/clients/s3";
import { env } from "~/lib/env";
import { assertFound } from "~/lib/invariant";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";

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

export const pollVideoUploadStatusServerFn = createServerFn({
  method: "POST",
})
  .validator(
    z.object({
      uploadId: z.string(),
    }),
  )
  .handler(async ({ data: input }) => {
    const video = await db.query.muxVideos.findFirst({
      where: eq(muxVideos.uploadId, input.uploadId),
    });

    assertFound(video);

    return video;
  });
