import { queryOptions } from "@tanstack/react-query";

import type { ServerFnData } from "~/lib/types";

import {
  archiveChainServerFn,
  deleteStackServerFn,
  getActiveChainServerFn,
  getLineServerFn,
  getStackServerFn,
  listArchivedChainsServerFn,
  removeArchiveVoteServerFn,
  stackUpServerFn,
  startChainServerFn,
  voteToArchiveServerFn,
} from "./fns";
import {
  archiveChainSchema,
  deleteStackSchema,
  getStackSchema,
  listArchivedChainsSchema,
  removeArchiveVoteSchema,
  stackUpSchema,
  startChainSchema,
  voteToArchiveSchema,
} from "./schemas";

export const sius = {
  chain: {
    active: {
      fn: getActiveChainServerFn,
      queryOptions: () =>
        queryOptions({
          queryKey: ["games.sius.chain.active"] as const,
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
          queryKey: ["games.sius.chain.archived", data] as const,
          queryFn: () => listArchivedChainsServerFn({ data }),
        }),
    },
    voteToArchive: {
      fn: voteToArchiveServerFn,
      schema: voteToArchiveSchema,
    },
    removeArchiveVote: {
      fn: removeArchiveVoteServerFn,
      schema: removeArchiveVoteSchema,
    },
  },
  stacks: {
    get: {
      fn: getStackServerFn,
      schema: getStackSchema,
      queryOptions: (data: ServerFnData<typeof getStackServerFn>) =>
        queryOptions({
          queryKey: ["games.sius.stacks.get", data] as const,
          queryFn: () => getStackServerFn({ data }),
        }),
    },
    stackUp: {
      fn: stackUpServerFn,
      schema: stackUpSchema,
    },
    delete: {
      fn: deleteStackServerFn,
      schema: deleteStackSchema,
    },
    line: {
      fn: getLineServerFn,
      schema: getStackSchema,
      queryOptions: (data: ServerFnData<typeof getLineServerFn>) =>
        queryOptions({
          queryKey: ["games.sius.stacks.line", data] as const,
          queryFn: () => getLineServerFn({ data }),
        }),
    },
  },
  admin: {
    archiveChain: {
      fn: archiveChainServerFn,
      schema: archiveChainSchema,
    },
  },
};
