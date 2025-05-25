import { createPresignedS3UrlServerFn } from "~/lib/media/fns";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";

export const media = {
  s3: {
    createPresignedS3Url: {
      fn: createPresignedS3UrlServerFn,
      schema: createPresignedS3UrlSchema,
    },
  },
};
