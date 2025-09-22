import { queryOptions, skipToken } from "@tanstack/react-query";

import {
  createPresignedMuxUrlServerFn,
  createPresignedS3UrlServerFn,
  getMuxVideoServerFn,
  pollMuxVideoUploadStatusServerFn,
} from "~/lib/media/fns";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";
import { type ServerFnData, type Skippable } from "~/lib/types";

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
