import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware } from "~/lib/middleware"
import {
  advancePhaseSchema,
  bracketActionSchema,
  createTournamentSchema,
  deleteTournamentSchema,
  getTournamentSchema,
  listTournamentsSchema,
  prelimActionSchema,
  rankingActionSchema,
  updateTournamentSchema,
} from "~/lib/tourney/schemas"

const loadTourneyOps = createServerOnlyFn(
  () => import("~/lib/tourney/ops.server"),
)

export const createTournamentServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createTournamentSchema))
  .handler(async (ctx) => {
    const { createTournament } = await loadTourneyOps()
    return createTournament(ctx)
  })

export const updateTournamentServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateTournamentSchema))
  .handler(async (ctx) => {
    const { updateTournament } = await loadTourneyOps()
    return updateTournament(ctx)
  })

export const deleteTournamentServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(deleteTournamentSchema))
  .handler(async (ctx) => {
    const { deleteTournament } = await loadTourneyOps()
    return deleteTournament(ctx)
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
  .middleware([authMiddleware])
  .inputValidator(zodValidator(listTournamentsSchema))
  .handler(async (ctx) => {
    const { listTournaments } = await loadTourneyOps()
    return listTournaments(ctx)
  })

export const prelimActionServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(prelimActionSchema))
  .handler(async (ctx) => {
    const { prelimAction } = await loadTourneyOps()
    return prelimAction(ctx)
  })

export const rankingActionServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(rankingActionSchema))
  .handler(async (ctx) => {
    const { rankingAction } = await loadTourneyOps()
    return rankingAction(ctx)
  })

export const bracketActionServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(bracketActionSchema))
  .handler(async (ctx) => {
    const { bracketAction } = await loadTourneyOps()
    return bracketAction(ctx)
  })

export const advancePhaseServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(advancePhaseSchema))
  .handler(async (ctx) => {
    const { advancePhase } = await loadTourneyOps()
    return advancePhase(ctx)
  })

export const adminHeartbeatServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(getTournamentSchema))
  .handler(async (ctx) => {
    const { adminHeartbeat } = await loadTourneyOps()
    return adminHeartbeat(ctx)
  })
