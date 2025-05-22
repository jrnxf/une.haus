import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { type TRPCRouterRecord } from "@trpc/server";
import { authProcedure } from "~/integrations/trpc/init";
import { env } from "~/lib/env";
import { s3Client } from "~/server/clients/s3";

export const mediaRouter = {
  getPresignedS3Url: authProcedure
    .input(
      z.object({
        fileName: z.string(),
        prefix: z.string().optional().default("media-skrrrt-final"),
      }),
    )
    .mutation(async ({ input }) => {
      const key = `${input.prefix}/${Date.now()}__${input.fileName}`;

      const command = new PutObjectCommand({
        Bucket: env.AWS_BUCKET_NAME as string,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 5, // 5 minutes
      });

      return url;
    }),
} satisfies TRPCRouterRecord;
