import { queryOptions } from "@tanstack/react-query"

import { type InsightsInput } from "~/lib/insights/schemas"
import { getTrafficServerFn } from "~/lib/traffic/fns"

export const traffic = {
  get: {
    fn: getTrafficServerFn,
    queryOptions: (data: InsightsInput) =>
      queryOptions({
        queryKey: ["traffic.get", data],
        queryFn: () => getTrafficServerFn({ data }),
        // Cloudflare limits how often the API can be asked, and the numbers
        // move slowly.
        staleTime: 1000 * 60 * 5,
      }),
  },
}
