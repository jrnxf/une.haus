import { queryOptions } from "@tanstack/react-query";

import {
  adminOnlyRotateRiusServerFn,
  createRiuSetServerFn,
  createRiuSubmissionServerFn,
  deleteRiuSetServerFn,
  getRiuSetServerFn,
  getRiuSubmissionServerFn,
  listActiveRiusServerFn,
  listArchivedRiusServerFn,
  listUpcomingRiuRosterServerFn,
  updateRiuSetServerFn,
} from "~/lib/games/rius/fns";
import {
  createRiuSetSchema,
  createRiuSubmissionSchema,
  deleteRiuSetSchema,
  getRiuSetSchema,
  getRiuSubmissionSchema,
  updateRiuSetSchema,
} from "~/lib/games/rius/schemas";
import { type ServerFnData } from "~/lib/types";

export const games = {
  rius: {
    active: {
      list: {
        fn: listActiveRiusServerFn,
        queryOptions: () => {
          return queryOptions({
            queryKey: ["games.rius.active.list"],
            queryFn: listActiveRiusServerFn,
          });
        },
      },
    },
    admin: {
      rotate: {
        fn: adminOnlyRotateRiusServerFn,
      },
    },
    archived: {
      list: {
        fn: listArchivedRiusServerFn,
        queryOptions: () => {
          return queryOptions({
            queryKey: ["games.rius.archived.list"],
            queryFn: listArchivedRiusServerFn,
          });
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
          });
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
          });
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
      },
      create: {
        fn: createRiuSubmissionServerFn,
        schema: createRiuSubmissionSchema,
      },
    },
  },
};
