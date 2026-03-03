import { queryOptions } from "@tanstack/react-query"

import {
  backUpSetServerFn,
  deleteSetServerFn,
  getChainsServerFn,
  getSetServerFn,
} from "./fns"
import { backUpSetSchema, deleteSetSchema, getSetSchema } from "./schemas"
import { type ServerFnData } from "~/lib/types"

export const bius = {
  rounds: {
    fn: getChainsServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["games.bius.rounds"] as const,
        queryFn: getChainsServerFn,
      }),
  },
  sets: {
    get: {
      fn: getSetServerFn,
      schema: getSetSchema,
      queryOptions: (data: ServerFnData<typeof getSetServerFn>) =>
        queryOptions({
          queryKey: ["games.bius.sets.get", data] as const,
          queryFn: () => getSetServerFn({ data }),
        }),
    },
    backUp: {
      fn: backUpSetServerFn,
      schema: backUpSetSchema,
    },
    delete: {
      fn: deleteSetServerFn,
      schema: deleteSetSchema,
    },
  },
}
