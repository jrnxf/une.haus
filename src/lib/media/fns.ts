import { createServerFn } from "@tanstack/react-start";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3Client } from "~/lib/clients/s3";
import { env } from "~/lib/env";
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
