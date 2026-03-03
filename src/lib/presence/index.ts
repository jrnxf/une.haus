import { queryOptions } from "@tanstack/react-query"

import { getOnlineUsersServerFn } from "~/lib/presence/fns"

export const presence = {
  online: {
    fn: getOnlineUsersServerFn,
    // Polls every 15s. Each poll doubles as a heartbeat (registers presence
    // on the server). React Query pauses polling when the tab is hidden
    // (refetchIntervalInBackground defaults to false) and refetches
    // immediately on focus restore (refetchOnWindowFocus defaults to true).
    // Data is ensured in the root loader for SSR — first paint includes
    // the current visitor in the count.
    queryOptions: () =>
      queryOptions({
        queryKey: ["presence.online"],
        queryFn: getOnlineUsersServerFn,
        staleTime: 15 * 1000,
        refetchInterval: 15 * 1000,
      }),
  },
}
