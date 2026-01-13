import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { PAGE_SIZE } from "~/lib/constants";
import { type ServerFnData, type ServerFnReturn } from "~/lib/types";
import {
  addUtvClapsServerFn,
  allUtvVideosServerFn,
  getUtvClapsServerFn,
  getUtvVideoServerFn,
  listUtvVideosServerFn,
  updateUtvScaleServerFn,
  updateUtvThumbnailSecondsServerFn,
  updateUtvTitleServerFn,
} from "~/lib/utv/fns";
import { listUtvVideosSchema } from "~/lib/utv/schemas";

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
  list: {
    fn: listUtvVideosServerFn,
    schema: listUtvVideosSchema,
    infiniteQueryOptions: (data: ServerFnData<typeof listUtvVideosServerFn>) => {
      return infiniteQueryOptions({
        queryKey: ["utv.list", data],
        queryFn: ({ pageParam: cursor }) => {
          return listUtvVideosServerFn({
            data: {
              ...data,
              cursor,
            },
          });
        },
        initialPageParam: 0 as number | undefined,
        getNextPageParam: (lastPage) => {
          if (lastPage.length < PAGE_SIZE) {
            return;
          }
          return lastPage.at(-1)?.id;
        },
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
export type UtvVideosListData = ServerFnReturn<typeof listUtvVideosServerFn>;
export type UtvVideoData = ServerFnReturn<typeof getUtvVideoServerFn>;
