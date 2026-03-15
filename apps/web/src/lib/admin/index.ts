import { queryOptions } from "@tanstack/react-query"

import { getPendingCountServerFn } from "~/lib/admin/fns"

export const admin = {
  pendingCount: {
    fn: getPendingCountServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["admin.pendingCount"],
        queryFn: getPendingCountServerFn,
        refetchInterval: 30_000,
      }),
  },
}
