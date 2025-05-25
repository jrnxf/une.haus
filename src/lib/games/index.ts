import { queryOptions } from "@tanstack/react-query";
import {
  adminOnlyRotateRiusServerFn,
  createRiuSetServerFn,
  createRiuSubmissionServerFn,
  deleteRiuSetServerFn,
  getRiuSetServerFn,
  getRiuSubmissionServerFn,
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

export const games = {
  rius: {
    admin: {
      rotate: {
        fn: adminOnlyRotateRiusServerFn,
      },
    },
    archived: {
      list: {
        fn: listArchivedRiusServerFn,
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
