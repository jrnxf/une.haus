import { z } from "zod"

const tournamentRiderSchema = z.object({
  userId: z.number().nullable(),
  name: z.string().nullable(),
})

export const createTournamentSchema = z.object({
  name: z.string().min(1),
  riders: z.array(tournamentRiderSchema).min(2),
  prelimTime: z.number().min(1).max(3600).default(60),
  battleTime: z.number().min(1).max(3600).default(60),
  finalsTime: z.number().min(1).max(3600).default(120),
  bracketSize: z.number().min(4).max(32).default(8),
})

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>

export const getTournamentSchema = z.object({
  code: z.string().min(4).max(4),
})

export const listTournamentsSchema = z.object({})

export const prelimActionSchema = z.object({
  code: z.string(),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("setCurrent"), riderIndex: z.number() }),
    z.object({ type: z.literal("markDone") }),
    z.object({ type: z.literal("markDQ") }),
    z.object({ type: z.literal("resetRider"), riderIndex: z.number() }),
    z.object({ type: z.literal("disqualifyRider"), riderIndex: z.number() }),
    z.object({ type: z.literal("startTimer") }),
    z.object({ type: z.literal("pauseTimer") }),
    z.object({ type: z.literal("resetTimer") }),
    z.object({
      type: z.literal("reorderRiders"),
      order: z.array(z.number()),
    }),
  ]),
})

export type PrelimActionInput = z.infer<typeof prelimActionSchema>

export const rankingActionSchema = z.object({
  code: z.string(),
  ranking: z.array(z.number()),
})

export type RankingActionInput = z.infer<typeof rankingActionSchema>

export const bracketActionSchema = z.object({
  code: z.string(),
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("selectWinner"),
      matchId: z.string(),
      winner: z.union([z.literal(1), z.literal(2)]),
    }),
    z.object({ type: z.literal("resetBracket") }),
    z.object({
      type: z.literal("openTimer"),
      matchId: z.string(),
      duration: z.number(),
    }),
    z.object({
      type: z.literal("startTimer"),
      matchId: z.string(),
      side: z.union([z.literal(1), z.literal(2)]),
      duration: z.number().optional(),
      otherRemaining: z.number().optional(),
    }),
    z.object({ type: z.literal("pauseTimer") }),
    z.object({ type: z.literal("resetTimer") }),
    z.object({ type: z.literal("softResetTimer") }),
    z.object({ type: z.literal("swapSides") }),
    z.object({ type: z.literal("showCelebration") }),
    z.object({ type: z.literal("dismissCelebration") }),
  ]),
})

export type BracketActionInput = z.infer<typeof bracketActionSchema>

export const advancePhaseSchema = z.object({
  code: z.string(),
  phase: z.enum(["prelims", "ranking", "bracket", "complete"]),
})

export type AdvancePhaseInput = z.infer<typeof advancePhaseSchema>

export const adminHeartbeatSchema = z.object({
  code: z.string(),
})
