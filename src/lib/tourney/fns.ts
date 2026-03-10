import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware } from "~/lib/middleware"
import {
  advancePhaseSchema,
  bracketActionSchema,
  createTournamentSchema,
  getTournamentSchema,
  listTournamentsSchema,
  prelimActionSchema,
  rankingActionSchema,
} from "~/lib/tourney/schemas"

const loadTourneyOps = createServerOnlyFn(
  () => import("~/lib/tourney/ops.server"),
)

export const createTournamentServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createTournamentSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createTournament } = await loadTourneyOps()
    return createTournament(ctx)
  })

export const getTournamentServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTournamentSchema))
  .handler(async (ctx) => {
    const { getTournament } = await loadTourneyOps()
    return getTournament(ctx)
  })

export const listTournamentsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listTournamentsSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { listTournaments } = await loadTourneyOps()
    return listTournaments(ctx)
  })

export const prelimActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(prelimActionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { prelimAction } = await loadTourneyOps()
    return prelimAction(ctx)
  })

export const rankingActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(rankingActionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { rankingAction } = await loadTourneyOps()
    return rankingAction(ctx)
  })

export const bracketActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(bracketActionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { bracketAction } = await loadTourneyOps()
    return bracketAction(ctx)
  })

export const advancePhaseServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(advancePhaseSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { advancePhase } = await loadTourneyOps()
    return advancePhase(ctx)
  })
