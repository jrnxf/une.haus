import { queryOptions } from "@tanstack/react-query";

import { getContributorsServerFn, getStatsServerFn } from "~/lib/stats/fns";

export const stats = {
  get: {
    fn: getStatsServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["stats.get"],
        queryFn: getStatsServerFn,
        staleTime: 60 * 1000, // 1 minute - stats can be slightly stale
      });
    },
  },
  contributors: {
    fn: getContributorsServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["stats.contributors"],
        queryFn: getContributorsServerFn,
        staleTime: 60 * 1000,
      });
    },
  },
};
