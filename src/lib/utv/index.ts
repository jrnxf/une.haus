import { queryOptions } from "@tanstack/react-query";

import { type ServerFnReturn } from "~/lib/types";
import {
  addUtvClapsServerFn,
  allUtvVideosServerFn,
  getUtvClapsServerFn,
  getUtvVideoServerFn,
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
  get: {
    fn: getUtvVideoServerFn,
    queryOptions: (id: number) => {
      return queryOptions({
        queryKey: ["utv.video", id],
        queryFn: () => getUtvVideoServerFn({ data: { id } }),
      });
    },
  },
  claps: {
    get: {
      fn: getUtvClapsServerFn,
      queryOptions: () => {
        return queryOptions({
          queryKey: ["utv.claps"],
          queryFn: getUtvClapsServerFn,
        });
      },
    },
    add: {
      fn: addUtvClapsServerFn,
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
export type UtvVideoData = ServerFnReturn<typeof getUtvVideoServerFn>;
