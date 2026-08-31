import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { bius } from "./bius"
import { sius } from "./sius"
import {
  adminOnlyRotateRiusServerFn,
  createRiuSetServerFn,
  createRiuSubmissionServerFn,
  deleteRiuSetServerFn,
  deleteRiuSubmissionServerFn,
  getArchivedRiusServerFn,
  getRiuSetServerFn,
  getRiuSubmissionServerFn,
  listActiveRiusServerFn,
  listArchivedRiuRoundsServerFn,
  listArchivedRiusServerFn,
  listUpcomingRiuRosterServerFn,
  updateRiuSetServerFn,
} from "~/lib/games/rius/fns"
import { ARCHIVED_ROUNDS_PAGE_SIZE } from "~/lib/games/rius/schemas"
import {
  createRiuSetSchema,
  createRiuSubmissionSchema,
  deleteRiuSetSchema,
  deleteRiuSubmissionSchema,
  getArchivedRiusSchema,
  getRiuSetSchema,
  getRiuSubmissionSchema,
  listArchivedRiuRoundsSchema,
  updateRiuSetSchema,
} from "~/lib/games/rius/schemas"
import { type ServerFnData } from "~/lib/types"

export const games = {
  rius: {
    active: {
      list: {
        fn: listActiveRiusServerFn,
        queryOptions: () => {
          return queryOptions({
            queryKey: ["games.rius.active.list"],
            queryFn: listActiveRiusServerFn,
          })
        },
      },
    },
    admin: {
      rotate: {
        fn: adminOnlyRotateRiusServerFn,
      },
    },
    archived: {
      get: {
        fn: getArchivedRiusServerFn,
        schema: getArchivedRiusSchema,
        queryOptions: (data: ServerFnData<typeof getArchivedRiusServerFn>) => {
          return queryOptions({
            queryKey: ["games.rius.archived.get", data],
            queryFn: () => getArchivedRiusServerFn({ data }),
          })
        },
      },
      list: {
        fn: listArchivedRiusServerFn,
        queryOptions: () => {
          return queryOptions({
            queryKey: ["games.rius.archived.list"],
            queryFn: listArchivedRiusServerFn,
          })
        },
      },
      rounds: {
        fn: listArchivedRiuRoundsServerFn,
        schema: listArchivedRiuRoundsSchema,
        infiniteQueryOptions: () => {
          return infiniteQueryOptions({
            queryKey: ["games.rius.archived.rounds"],
            queryFn: ({ pageParam: cursor }) =>
              listArchivedRiuRoundsServerFn({ data: { cursor } }),
            initialPageParam: 0,
            getNextPageParam: (lastPage) => {
              if (lastPage.length < ARCHIVED_ROUNDS_PAGE_SIZE) return undefined
              return lastPage.at(-1)?.id
            },
          })
        },
      },
    },
    upcoming: {
      roster: {
        fn: listUpcomingRiuRosterServerFn,
        queryOptions: () => {
          return queryOptions({
            queryKey: ["games.rius.upcoming.roster"],
            queryFn: listUpcomingRiuRosterServerFn,
          })
        },
      },
    },
    sets: {
      get: {
        fn: getRiuSetServerFn,
        schema: getRiuSetSchema,
        queryOptions: (data: ServerFnData<typeof getRiuSetServerFn>) => {
          return queryOptions({
            queryKey: ["games.rius.sets.get", data],
            queryFn: () => getRiuSetServerFn({ data }),
          })
        },
      },
      create: {
        fn: createRiuSetServerFn,
        schema: createRiuSetSchema,
      },
      update: {
        fn: updateRiuSetServerFn,
        schema: updateRiuSetSchema,
      },
      delete: {
        fn: deleteRiuSetServerFn,
        schema: deleteRiuSetSchema,
      },
    },
    submissions: {
      get: {
        fn: getRiuSubmissionServerFn,
        schema: getRiuSubmissionSchema,
        queryOptions: (data: ServerFnData<typeof getRiuSubmissionServerFn>) => {
          return queryOptions({
            queryKey: ["games.rius.submissions.get", data],
            queryFn: () => getRiuSubmissionServerFn({ data }),
          })
        },
      },
      create: {
        fn: createRiuSubmissionServerFn,
        schema: createRiuSubmissionSchema,
      },
      delete: {
        fn: deleteRiuSubmissionServerFn,
        schema: deleteRiuSubmissionSchema,
      },
    },
  },
  bius,
  sius,
}

export {
  groupSetsByUserWithRankings,
  type RankedRider,
} from "./rius/leaderboard"
