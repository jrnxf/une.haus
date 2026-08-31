import { queryOptions } from "@tanstack/react-query"

import { getOnlineUsersServerFn } from "~/lib/presence/fns"

export const presence = {
  online: {
    fn: getOnlineUsersServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["presence.online"],
        queryFn: getOnlineUsersServerFn,
        staleTime: 15 * 1000,
        refetchInterval: 15 * 1000,
      }),
  },
}
