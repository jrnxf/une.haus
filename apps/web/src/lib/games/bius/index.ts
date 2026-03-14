import { queryOptions } from "@tanstack/react-query"

import {
  backUpSetServerFn,
  createFirstSetServerFn,
  deleteSetServerFn,
  getChainsServerFn,
  getSetServerFn,
  startRoundServerFn,
} from "./fns"
import {
  backUpSetSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getSetSchema,
  startRoundSchema,
} from "./schemas"
import { type ServerFnData } from "~/lib/types"

export const bius = {
  rounds: {
    fn: getChainsServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["games.bius.rounds"] as const,
        queryFn: getChainsServerFn,
      }),
    start: {
      fn: startRoundServerFn,
      schema: startRoundSchema,
    },
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
    createFirst: {
      fn: createFirstSetServerFn,
      schema: createFirstSetSchema,
    },
    delete: {
      fn: deleteSetServerFn,
      schema: deleteSetSchema,
    },
  },
}
