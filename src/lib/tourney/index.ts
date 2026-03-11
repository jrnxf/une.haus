import { queryOptions } from "@tanstack/react-query"

import {
  advancePhaseServerFn,
  bracketActionServerFn,
  createTournamentServerFn,
  deleteTournamentServerFn,
  getTournamentServerFn,
  listTournamentsServerFn,
  prelimActionServerFn,
  rankingActionServerFn,
} from "~/lib/tourney/fns"
import {
  advancePhaseSchema,
  bracketActionSchema,
  createTournamentSchema,
  deleteTournamentSchema,
  getTournamentSchema,
  listTournamentsSchema,
  prelimActionSchema,
  rankingActionSchema,
} from "~/lib/tourney/schemas"
import { type ServerFnData } from "~/lib/types"

export const tourney = {
  create: {
    fn: createTournamentServerFn,
    schema: createTournamentSchema,
  },
  delete: {
    fn: deleteTournamentServerFn,
    schema: deleteTournamentSchema,
  },
  get: {
    fn: getTournamentServerFn,
    schema: getTournamentSchema,
    queryOptions: (data: ServerFnData<typeof getTournamentServerFn>) =>
      queryOptions({
        queryKey: ["tourney.get", data] as const,
        queryFn: () => getTournamentServerFn({ data }),
      }),
  },
  list: {
    fn: listTournamentsServerFn,
    schema: listTournamentsSchema,
    queryOptions: () =>
      queryOptions({
        queryKey: ["tourney.list"] as const,
        queryFn: () => listTournamentsServerFn({ data: {} }),
      }),
  },
  prelim: {
    fn: prelimActionServerFn,
    schema: prelimActionSchema,
  },
  rank: {
    fn: rankingActionServerFn,
    schema: rankingActionSchema,
  },
  bracket: {
    fn: bracketActionServerFn,
    schema: bracketActionSchema,
  },
  advancePhase: {
    fn: advancePhaseServerFn,
    schema: advancePhaseSchema,
  },
}
