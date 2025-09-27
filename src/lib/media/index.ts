import {
  createPresignedMuxUrlServerFn,
  createPresignedS3UrlServerFn,
  pollMuxVideoUploadStatusServerFn,
} from "~/lib/media/fns";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";

export const media = {
  createPresignedS3Url: {
    fn: createPresignedS3UrlServerFn,
    schema: createPresignedS3UrlSchema,
  },

  createPresignedMuxUrl: {
    fn: createPresignedMuxUrlServerFn,
  },

  pollMuxVideoUploadStatus: {
    fn: pollMuxVideoUploadStatusServerFn,
  },
};

export * from "~/lib/media/hooks";
