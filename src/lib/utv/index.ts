import { queryOptions } from "@tanstack/react-query";

import { type ServerFnReturn } from "~/lib/types";
import {
  allUtvVideosServerFn,
  updateUtvScaleServerFn,
  updateUtvThumbnailSecondsServerFn,
  updateUtvTitleServerFn,
} from "~/lib/utv/fns";

export const utv = {
  all: {
    fn: allUtvVideosServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["utv.all"],
        queryFn: allUtvVideosServerFn,
      });
    },
  },
  updateScale: {
    fn: updateUtvScaleServerFn,
  },
  updateThumbnailSeconds: {
    fn: updateUtvThumbnailSecondsServerFn,
  },
  updateTitle: {
    fn: updateUtvTitleServerFn,
  },
};

export type UtvVideosData = ServerFnReturn<typeof allUtvVideosServerFn>;
