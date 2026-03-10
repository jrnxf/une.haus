import { queryOptions } from "@tanstack/react-query"

import {
  flagContentServerFn,
  listFlagsServerFn,
  resolveFlagServerFn,
} from "./fns"
import { flagContentSchema, resolveFlagSchema } from "./schemas"

export const flagsDomain = {
  flag: {
    fn: flagContentServerFn,
    schema: flagContentSchema,
  },
  resolve: {
    fn: resolveFlagServerFn,
    schema: resolveFlagSchema,
  },
  list: {
    fn: listFlagsServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["flags.list"] as const,
        queryFn: listFlagsServerFn,
      }),
  },
}
