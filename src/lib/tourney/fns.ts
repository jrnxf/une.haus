import { createServerFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { desc, eq } from "drizzle-orm"

import { db } from "~/db"
import { tournaments } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import { authMiddleware } from "~/lib/middleware"
import { applyMachineEvent, type TournamentEvent } from "~/lib/tourney/machine"
import {
  publishAdminHeartbeat,
  publishTourneyUpdate,
} from "~/lib/tourney/realtime"
import {
  adminHeartbeatSchema,
  advancePhaseSchema,
  bracketActionSchema,
  createTournamentSchema,
  getTournamentSchema,
  listTournamentsSchema,
  prelimActionSchema,
  rankingActionSchema,
} from "~/lib/tourney/schemas"
import { type TournamentPhase, type TournamentState } from "~/lib/tourney/types"

// Characters that are unambiguous (no 0/O/1/I/L)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

function generateCode(): string {
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode()
    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.code, code),
      columns: { id: true },
    })
    if (!existing) return code
  }
  throw new Error("Failed to generate unique tournament code")
}

async function getTournamentByCode(code: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.code, code.toUpperCase()),
  })
  invariant(tournament, "Tournament not found")
  return tournament
}

async function updateTournamentState(
  id: number,
  code: string,
  currentPhase: string,
  state: TournamentState,
  newPhase?: string,
) {
  const phase = newPhase ?? currentPhase
  const updates: Record<string, unknown> = {
    state,
    updatedAt: new Date(),
  }
  if (newPhase) updates.phase = newPhase

  // Publish to SSE subscribers immediately for minimal latency,
  // then persist to DB in the background.
  publishTourneyUpdate(code, {
    phase,
    state,
    updatedAt: Date.now(),
  })

  await db.update(tournaments).set(updates).where(eq(tournaments.id, id))
}

export const createTournamentServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createTournamentSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const code = await generateUniqueCode()

    const initialState: TournamentState = {
      riders: input.riders,
      prelimTime: input.prelimTime,
      battleTime: input.battleTime,
      finalsTime: input.finalsTime,
      bracketSize: input.bracketSize,
      prelimStatuses: {},
      currentRiderIndex: null,
      timer: null,
      ranking: null,
      bracketRiders: null,
      winners: null,
      celebrating: false,
    }

    const [tournament] = await db
      .insert(tournaments)
      .values({
        code,
        name: input.name,
        phase: "prelims",
        createdByUserId: context.user.id,
        state: initialState,
      })
      .returning()

    return tournament
  })

export const getTournamentServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTournamentSchema))
  .handler(async ({ data: input }) => {
    // No auth -- public access for spectators
    return getTournamentByCode(input.code)
  })

export const listTournamentsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listTournamentsSchema))
  .handler(async () => {
    return db.query.tournaments.findMany({
      orderBy: desc(tournaments.createdAt),
    })
  })

export const prelimActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(prelimActionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code)
    invariant(tournament.createdByUserId === context.user.id, "Not authorized")

    const event = mapPrelimActionToEvent(input.action)
    const result = applyMachineEvent(
      tournament.phase as TournamentPhase,
      tournament.state as TournamentState,
      event,
    )

    await updateTournamentState(
      tournament.id,
      tournament.code,
      tournament.phase,
      result.state,
    )
    return { state: result.state }
  })

export const rankingActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(rankingActionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code)
    invariant(tournament.createdByUserId === context.user.id, "Not authorized")

    const event: TournamentEvent = {
      type: "ranking.save",
      ranking: input.ranking,
    }
    const result = applyMachineEvent(
      tournament.phase as TournamentPhase,
      tournament.state as TournamentState,
      event,
    )

    await updateTournamentState(
      tournament.id,
      tournament.code,
      tournament.phase,
      result.state,
    )
    return { state: result.state }
  })

export const bracketActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(bracketActionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code)
    invariant(tournament.createdByUserId === context.user.id, "Not authorized")

    const event = mapBracketActionToEvent(input.action)
    const result = applyMachineEvent(
      tournament.phase as TournamentPhase,
      tournament.state as TournamentState,
      event,
    )

    await updateTournamentState(
      tournament.id,
      tournament.code,
      tournament.phase,
      result.state,
    )
    return { state: result.state }
  })

export const advancePhaseServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(advancePhaseSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code)
    invariant(tournament.createdByUserId === context.user.id, "Not authorized")

    const event: TournamentEvent = {
      type: "phase.advance",
      phase: input.phase,
    }
    const result = applyMachineEvent(
      tournament.phase as TournamentPhase,
      tournament.state as TournamentState,
      event,
    )

    await updateTournamentState(
      tournament.id,
      tournament.code,
      tournament.phase,
      result.state,
      result.phase,
    )
    return { phase: result.phase, state: result.state }
  })

export const adminHeartbeatServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(adminHeartbeatSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code)
    invariant(tournament.createdByUserId === context.user.id, "Not authorized")
    publishAdminHeartbeat(tournament.code)
  })

// ---------------------------------------------------------------------------
// Action → Event adapters
// ---------------------------------------------------------------------------

type PrelimAction = {
  type:
    | "setCurrent"
    | "markDone"
    | "markDQ"
    | "resetRider"
    | "disqualifyRider"
    | "startTimer"
    | "pauseTimer"
    | "resetTimer"
    | "reorderRiders"
  riderIndex?: number
  order?: number[]
}

function mapPrelimActionToEvent(action: PrelimAction): TournamentEvent {
  switch (action.type) {
    case "setCurrent": {
      return { type: "prelim.setCurrent", riderIndex: action.riderIndex! }
    }
    case "markDone": {
      return { type: "prelim.markDone" }
    }
    case "markDQ": {
      return { type: "prelim.markDQ" }
    }
    case "resetRider": {
      return { type: "prelim.resetRider", riderIndex: action.riderIndex! }
    }
    case "disqualifyRider": {
      return { type: "prelim.disqualifyRider", riderIndex: action.riderIndex! }
    }
    case "startTimer": {
      return { type: "prelim.startTimer" }
    }
    case "pauseTimer": {
      return { type: "prelim.pauseTimer" }
    }
    case "resetTimer": {
      return { type: "prelim.resetTimer" }
    }
    case "reorderRiders": {
      return { type: "prelim.reorderRiders", order: action.order! }
    }
  }
}

type BracketAction = {
  type:
    | "selectWinner"
    | "resetBracket"
    | "openTimer"
    | "startTimer"
    | "pauseTimer"
    | "resetTimer"
    | "softResetTimer"
    | "swapSides"
    | "showCelebration"
    | "dismissCelebration"
  matchId?: string
  winner?: 1 | 2
  duration?: number
  side?: 1 | 2
  otherRemaining?: number
}

function mapBracketActionToEvent(action: BracketAction): TournamentEvent {
  switch (action.type) {
    case "selectWinner": {
      return {
        type: "bracket.selectWinner",
        matchId: action.matchId!,
        winner: action.winner!,
      }
    }
    case "resetBracket": {
      return { type: "bracket.resetBracket" }
    }
    case "openTimer": {
      return {
        type: "bracket.openTimer",
        matchId: action.matchId!,
        duration: action.duration!,
      }
    }
    case "startTimer": {
      return {
        type: "bracket.startTimer",
        matchId: action.matchId!,
        side: action.side!,
        duration: action.duration,
        otherRemaining: action.otherRemaining,
      }
    }
    case "pauseTimer": {
      return { type: "bracket.pauseTimer" }
    }
    case "resetTimer": {
      return { type: "bracket.resetTimer" }
    }
    case "softResetTimer": {
      return { type: "bracket.softResetTimer" }
    }
    case "swapSides": {
      return { type: "bracket.swapSides" }
    }
    case "showCelebration": {
      return { type: "bracket.showCelebration" }
    }
    case "dismissCelebration": {
      return { type: "bracket.dismissCelebration" }
    }
  }
}
