import { queryOptions } from "@tanstack/react-query"

import {
  getAskInsightsServerFn,
  getMemberInsightsServerFn,
  getOverviewServerFn,
} from "~/lib/insights/fns"
import { type InsightsInput, insightsSchema } from "~/lib/insights/schemas"

export const insights = {
  schema: insightsSchema,
  overview: {
    fn: getOverviewServerFn,
    queryOptions: (data: InsightsInput) =>
      queryOptions({
        queryKey: ["insights.overview", data],
        queryFn: () => getOverviewServerFn({ data }),
      }),
  },
  ask: {
    fn: getAskInsightsServerFn,
    queryOptions: (data: InsightsInput) =>
      queryOptions({
        queryKey: ["insights.ask", data],
        queryFn: () => getAskInsightsServerFn({ data }),
      }),
  },
  members: {
    fn: getMemberInsightsServerFn,
    queryOptions: (data: InsightsInput) =>
      queryOptions({
        queryKey: ["insights.members", data],
        queryFn: () => getMemberInsightsServerFn({ data }),
      }),
  },
}
