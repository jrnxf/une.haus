import { queryOptions } from "@tanstack/react-query"

import { getAskUsageServerFn } from "~/lib/ask/fns"

export const ask = {
  usage: {
    fn: getAskUsageServerFn,
    // Keyed by user, so a sign-in does not show the guest's empty value.
    queryOptions: (userId: number | null) =>
      queryOptions({
        queryKey: ["ask.usage.get", userId],
        queryFn: getAskUsageServerFn,
      }),
  },
}
