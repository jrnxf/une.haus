import "@tanstack/react-start/server-only"
import { desc, eq } from "drizzle-orm"

import { db } from "~/db"
import { tournaments } from "~/db/schema"
import { ably } from "~/lib/ably.server"
import { invariant } from "~/lib/invariant"
import { applyMachineEvent, type TournamentEvent } from "~/lib/tourney/machine"
import {
  type AdvancePhaseInput,
  type BracketActionInput,
  type CreateTournamentInput,
  type DeleteTournamentInput,
  type PrelimActionInput,
  type RankingActionInput,
  type UpdateTournamentInput,
} from "~/lib/tourney/schemas"
import { type TournamentPhase, type TournamentState } from "~/lib/tourney/types"

type AuthenticatedContext = {
  user: {
    id: number
  }
}

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

export async function getTournament({
  data: input,
}: {
  data: {
    code: string
  }
}) {
  return getTournamentByCode(input.code)
}

export async function listTournaments({
  context,
}: {
  context: AuthenticatedContext
}) {
  return db.query.tournaments.findMany({
    where: eq(tournaments.createdByUserId, context.user.id),
    orderBy: desc(tournaments.createdAt),
  })
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

  // Publish to Ably subscribers immediately for minimal latency,
  // then persist to DB.
  ably.channels.get(`tourney-${code}`).publish("state-update", {
    phase,
    state,
    updatedAt: Date.now(),
  })

  await db.update(tournaments).set(updates).where(eq(tournaments.id, id))
}

export async function createTournament({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: CreateTournamentInput
}) {
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
}

export async function updateTournament({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: UpdateTournamentInput
}) {
  const tournament = await getTournamentByCode(input.code)
  invariant(tournament.createdByUserId === context.user.id, "Not authorized")

  const [updated] = await db
    .update(tournaments)
    .set({ name: input.name, updatedAt: new Date() })
    .where(eq(tournaments.id, tournament.id))
    .returning()

  return updated
}

export async function deleteTournament({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: DeleteTournamentInput
}) {
  const tournament = await getTournamentByCode(input.code)
  invariant(tournament.createdByUserId === context.user.id, "Not authorized")

  await db.delete(tournaments).where(eq(tournaments.id, tournament.id))
}

export async function prelimAction({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: PrelimActionInput
}) {
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
}

export async function rankingAction({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: RankingActionInput
}) {
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
}

export async function bracketAction({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: BracketActionInput
}) {
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
}

export async function advancePhase({
  data: input,
  context,
}: {
  context: AuthenticatedContext
  data: AdvancePhaseInput
}) {
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
}

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
