import { queryOptions, skipToken } from "@tanstack/react-query";

import {
  createPresignedS3UrlServerFn,
  pollVideoUploadStatusServerFn,
} from "~/lib/media/fns";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";
import { type ServerFnData, type Skippable } from "~/lib/types";

export const media = {
  createPresignedS3Url: {
    fn: createPresignedS3UrlServerFn,
    schema: createPresignedS3UrlSchema,
  },
  pollVideoUploadStatus: {
    fn: pollVideoUploadStatusServerFn,
    queryOptions: (
      data: Skippable<ServerFnData<typeof pollVideoUploadStatusServerFn>>,
    ) => {
      return queryOptions({
        queryKey: ["media.pollVideoUploadStatus", data],
        queryFn:
          typeof data === "symbol"
            ? skipToken
            : () => pollVideoUploadStatusServerFn({ data }),
      });
    },
  },
};
