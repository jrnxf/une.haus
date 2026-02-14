import { queryOptions } from "@tanstack/react-query";

import type { ServerFnData } from "~/lib/types";

import {
  backUpSetServerFn,
  deleteSetServerFn,
  flagSetServerFn,
  getActiveChainServerFn,
  getSetServerFn,
  listArchivedChainsServerFn,
  resolveFlagServerFn,
  startChainServerFn,
} from "./fns";
import {
  backUpSetSchema,
  deleteSetSchema,
  flagSetSchema,
  getSetSchema,
  listArchivedChainsSchema,
  resolveFlagSchema,
  startChainSchema,
} from "./schemas";

export const bius = {
  chain: {
    active: {
      fn: getActiveChainServerFn,
      queryOptions: () =>
        queryOptions({
          queryKey: ["games.bius.chain.active"] as const,
          queryFn: getActiveChainServerFn,
        }),
    },
    start: {
      fn: startChainServerFn,
      schema: startChainSchema,
    },
    archived: {
      fn: listArchivedChainsServerFn,
      schema: listArchivedChainsSchema,
      queryOptions: (data: ServerFnData<typeof listArchivedChainsServerFn>) =>
        queryOptions({
          queryKey: ["games.bius.chain.archived", data] as const,
          queryFn: () => listArchivedChainsServerFn({ data }),
        }),
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
    flag: {
      fn: flagSetServerFn,
      schema: flagSetSchema,
    },
    delete: {
      fn: deleteSetServerFn,
      schema: deleteSetSchema,
    },
  },
  admin: {
    resolveFlag: {
      fn: resolveFlagServerFn,
      schema: resolveFlagSchema,
    },
  },
};
