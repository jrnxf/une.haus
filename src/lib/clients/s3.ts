import { S3Client } from "@aws-sdk/client-s3"

import { env } from "~/lib/env"

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.HAUS_AWS_ACCESS_KEY_ID,
    secretAccessKey: env.HAUS_AWS_SECRET_ACCESS_KEY,
  },
  region: env.HAUS_AWS_REGION,
})
