import { queryOptions } from "@tanstack/react-query"

import { getHomeLatestServerFn } from "~/lib/home/fns"
import { type ServerFnReturn } from "~/lib/types"

export const home = {
  latest: {
    fn: getHomeLatestServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["home.latest"],
        queryFn: getHomeLatestServerFn,
        staleTime: 60 * 1000, // matches the server cache
      })
    },
  },
}

export type HomeLatestData = ServerFnReturn<typeof getHomeLatestServerFn>
