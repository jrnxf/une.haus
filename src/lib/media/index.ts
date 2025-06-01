import { queryOptions } from "@tanstack/react-query";

import {
  createPresignedS3UrlServerFn,
  pollVideoUploadStatusServerFn,
} from "~/lib/media/fns";
import { createPresignedS3UrlSchema } from "~/lib/media/schemas";
import { type ServerFnData } from "~/lib/types";

export const media = {
  createPresignedS3Url: {
    fn: createPresignedS3UrlServerFn,
    schema: createPresignedS3UrlSchema,
  },
  pollVideoUploadStatus: {
    fn: pollVideoUploadStatusServerFn,
    queryOptions: (
      data: ServerFnData<typeof pollVideoUploadStatusServerFn>,
    ) => {
      return queryOptions({
        queryKey: ["media.pollVideoUploadStatus", data],
        queryFn: () => pollVideoUploadStatusServerFn({ data }),
      });
    },
  },
};
