import { queryOptions } from "@tanstack/react-query"

import {
  addSetServerFn,
  archiveRoundServerFn,
  createFirstSetServerFn,
  deleteSetServerFn,
  getActiveRoundsServerFn,
  getArchivedRoundServerFn,
  getLineServerFn,
  getSetServerFn,
  listArchivedRoundsServerFn,
  removeArchiveVoteServerFn,
  startRoundServerFn,
  voteToArchiveServerFn,
} from "./fns"
import {
  addSetSchema,
  archiveRoundSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getArchivedRoundSchema,
  getSetSchema,
  removeArchiveVoteSchema,
  startRoundSchema,
  voteToArchiveSchema,
} from "./schemas"
import { type ServerFnData } from "~/lib/types"

export const sius = {
  rounds: {
    active: {
      fn: getActiveRoundsServerFn,
      queryOptions: () =>
        queryOptions({
          queryKey: ["games.sius.rounds.active"] as const,
          queryFn: getActiveRoundsServerFn,
        }),
    },
    start: {
      fn: startRoundServerFn,
      schema: startRoundSchema,
    },
    archived: {
      list: {
        fn: listArchivedRoundsServerFn,
        queryOptions: () =>
          queryOptions({
            queryKey: ["games.sius.rounds.archived.list"] as const,
            queryFn: listArchivedRoundsServerFn,
          }),
      },
      get: {
        fn: getArchivedRoundServerFn,
        schema: getArchivedRoundSchema,
        queryOptions: (data: ServerFnData<typeof getArchivedRoundServerFn>) =>
          queryOptions({
            queryKey: ["games.sius.rounds.archived.get", data] as const,
            queryFn: () => getArchivedRoundServerFn({ data }),
          }),
      },
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
  sets: {
    get: {
      fn: getSetServerFn,
      schema: getSetSchema,
      queryOptions: (data: ServerFnData<typeof getSetServerFn>) =>
        queryOptions({
          queryKey: ["games.sius.sets.get", data] as const,
          queryFn: () => getSetServerFn({ data }),
        }),
    },
    add: {
      fn: addSetServerFn,
      schema: addSetSchema,
    },
    createFirst: {
      fn: createFirstSetServerFn,
      schema: createFirstSetSchema,
    },
    delete: {
      fn: deleteSetServerFn,
      schema: deleteSetSchema,
    },
    line: {
      fn: getLineServerFn,
      schema: getSetSchema,
      queryOptions: (data: ServerFnData<typeof getLineServerFn>) =>
        queryOptions({
          queryKey: ["games.sius.sets.line", data] as const,
          queryFn: () => getLineServerFn({ data }),
        }),
    },
  },
  admin: {
    archiveRound: {
      fn: archiveRoundServerFn,
      schema: archiveRoundSchema,
    },
  },
}
