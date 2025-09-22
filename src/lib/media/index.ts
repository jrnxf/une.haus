import { queryOptions, skipToken } from "@tanstack/react-query";

import {
  createPresignedMuxUrlServerFn,
  createPresignedS3UrlServerFn,
  getMuxVideoUploadStatusServerFn,
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

  getMuxVideoUploadStatus: {
    fn: getMuxVideoUploadStatusServerFn,
    queryOptions: (data: string | undefined) => {
      return queryOptions({
        queryKey: ["media.getMuxVideoUploadStatus", data],
        queryFn: data
          ? () => getMuxVideoUploadStatusServerFn({ data })
          : skipToken,
      });
    },
  },
};
