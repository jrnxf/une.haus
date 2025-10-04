import { queryOptions } from "@tanstack/react-query";

import { type ServerFnReturn } from "~/lib/types";
import { allUtvVideosServerFn } from "~/lib/utv/fns";

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
};

export type UtvVideosData = ServerFnReturn<typeof allUtvVideosServerFn>;
