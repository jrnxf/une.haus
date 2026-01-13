import { queryOptions } from "@tanstack/react-query";

import { getTricksData } from "./data";

export type { Trick, TricksData } from "./types";

export const tricks = {
  get: {
    queryOptions: () => {
      return queryOptions({
        queryKey: ["tricks.get"],
        queryFn: () => getTricksData(),
        staleTime: Infinity, // Static data never goes stale
      });
    },
  },
};
