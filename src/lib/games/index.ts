import { queryOptions } from "@tanstack/react-query";

import {
  adminOnlyRotateRiusServerFn,
  createRiuSetServerFn,
  createRiuSubmissionServerFn,
  deleteRiuSetServerFn,
  getArchivedRiusServerFn,
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
  getArchivedRiusSchema,
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
      get: {
        fn: getArchivedRiusServerFn,
        schema: getArchivedRiusSchema,
        queryOptions: (data: ServerFnData<typeof getArchivedRiusServerFn>) => {
          return queryOptions({
            queryKey: ["games.rius.archived.get", data],
            queryFn: () => getArchivedRiusServerFn({ data }),
          });
        },
      },
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
        queryOptions: (data: ServerFnData<typeof getRiuSubmissionServerFn>) => {
          return queryOptions({
            queryKey: ["games.rius.submissions.get", data],
            queryFn: () => getRiuSubmissionServerFn({ data }),
          });
        },
      },
      create: {
        fn: createRiuSubmissionServerFn,
        schema: createRiuSubmissionSchema,
      },
    },
  },
};

export function groupSetsByUser<T extends { user: { id: number } }>(sets: T[]) {
  const groups: Record<number, { user: T["user"]; sets: T[] }> = {};

  for (const set of sets) {
    const userId = set.user.id;
    const existing = groups[userId];
    if (existing) {
      existing.sets.push(set);
    } else {
      groups[userId] = {
        user: set.user,
        sets: [set],
      };
    }
  }

  return groups;
}
