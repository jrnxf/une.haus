import { queryOptions, skipToken } from "@tanstack/react-query";

import {
  createPresignedMuxUrlServerFn,
  createPresignedS3UrlServerFn,
  getMuxVideoServerFn,
  getMuxVideoUploadStatusServerFn,
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

  getMuxVideoUploadStatus: {
    fn: getMuxVideoUploadStatusServerFn,
    queryOptions: (
      data: Skippable<ServerFnData<typeof getMuxVideoUploadStatusServerFn>>,
    ) => {
      return queryOptions({
        queryKey: [
          "media.getMuxVideoUploadStatusServerFn",
          typeof data === "symbol" ? "SKIP" : data,
        ],
        queryFn:
          typeof data === "symbol"
            ? skipToken
            : () => getMuxVideoUploadStatusServerFn({ data }),
      });
    },
  },
  getMuxVideo: {
    fn: getMuxVideoServerFn,
    queryOptions: (
      data: Skippable<ServerFnData<typeof getMuxVideoServerFn>>,
    ) => {
      return queryOptions({
        queryKey: [
          "media.getMuxVideo",
          typeof data === "symbol" ? "SKIP" : data,
        ],
        queryFn:
          typeof data === "symbol"
            ? skipToken
            : () => getMuxVideoServerFn({ data }),
      });
    },
  },
};
