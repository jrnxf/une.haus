import { createServerFn } from "@tanstack/react-start";

import { zodValidator } from "@tanstack/zod-adapter";
import { desc, eq } from "drizzle-orm";

import { db } from "~/db";
import { tournaments } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { authMiddleware } from "~/lib/middleware";
import {
  publishAdminHeartbeat,
  publishTourneyUpdate,
} from "~/lib/tourney/realtime";
import {
  adminHeartbeatSchema,
  advancePhaseSchema,
  bracketActionSchema,
  createTournamentSchema,
  getTournamentSchema,
  listTournamentsSchema,
  prelimActionSchema,
  rankingActionSchema,
} from "~/lib/tourney/schemas";
import type { PrelimStatus, TournamentState } from "~/lib/tourney/types";

// Characters that are unambiguous (no 0/O/1/I/L)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await db.query.tournaments.findFirst({
      where: eq(tournaments.code, code),
      columns: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique tournament code");
}

async function getTournamentByCode(code: string) {
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.code, code.toUpperCase()),
  });
  invariant(tournament, "Tournament not found");
  return tournament;
}

async function updateTournamentState(
  id: number,
  code: string,
  currentPhase: string,
  state: TournamentState,
  newPhase?: string,
) {
  const phase = newPhase ?? currentPhase;
  const updates: Record<string, unknown> = {
    state,
    updatedAt: new Date(),
  };
  if (newPhase) updates.phase = newPhase;

  // Publish to SSE subscribers immediately for minimal latency,
  // then persist to DB in the background.
  publishTourneyUpdate(code, {
    phase,
    state,
    updatedAt: Date.now(),
  });

  await db.update(tournaments).set(updates).where(eq(tournaments.id, id));
}

export const createTournamentServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createTournamentSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const code = await generateUniqueCode();

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
    };

    const [tournament] = await db
      .insert(tournaments)
      .values({
        code,
        name: input.name,
        phase: "prelims",
        createdByUserId: context.user.id,
        state: initialState,
      })
      .returning();

    return tournament;
  });

export const getTournamentServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getTournamentSchema))
  .handler(async ({ data: input }) => {
    // No auth -- public access for spectators
    return getTournamentByCode(input.code);
  });

export const listTournamentsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listTournamentsSchema))
  .handler(async () => {
    return db.query.tournaments.findMany({
      orderBy: desc(tournaments.createdAt),
    });
  });

export const prelimActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(prelimActionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code);
    invariant(
      tournament.createdByUserId === context.user.id,
      "Not authorized",
    );

    const state = { ...tournament.state } as TournamentState;
    const { action } = input;

    switch (action.type) {
      case "setCurrent": {
        state.currentRiderIndex =
          action.riderIndex >= 0 ? action.riderIndex : null;
        state.timer = null;
        break;
      }
      case "markDone": {
        invariant(state.currentRiderIndex !== null, "No current rider");
        state.prelimStatuses[state.currentRiderIndex] = "done";
        // Advance to next pending rider
        const nextIndex = findNextPending(
          state.riders.length,
          state.prelimStatuses,
          state.currentRiderIndex,
        );
        state.currentRiderIndex = nextIndex;
        state.timer = null;
        break;
      }
      case "markDQ": {
        invariant(state.currentRiderIndex !== null, "No current rider");
        state.prelimStatuses[state.currentRiderIndex] = "dq";
        const nextIndex = findNextPending(
          state.riders.length,
          state.prelimStatuses,
          state.currentRiderIndex,
        );
        state.currentRiderIndex = nextIndex;
        state.timer = null;
        break;
      }
      case "resetRider": {
        delete state.prelimStatuses[action.riderIndex];
        break;
      }
      case "disqualifyRider": {
        state.prelimStatuses[action.riderIndex] = "dq";
        break;
      }
      case "startTimer": {
        const remaining = state.timer?.pausedRemaining ?? null;
        state.timer = {
          active: true,
          riderIndex: state.currentRiderIndex,
          matchId: null,
          side: null,
          startedAt: Date.now(),
          pausedRemaining: null,
          duration: remaining
            ? remaining / 1000
            : state.prelimTime,
          otherSideRemaining: null,
          swapped: false,
        };
        break;
      }
      case "pauseTimer": {
        if (state.timer?.active && state.timer.startedAt) {
          const elapsed = Date.now() - state.timer.startedAt;
          const remaining = state.timer.duration * 1000 - elapsed;
          state.timer = {
            ...state.timer,
            active: false,
            startedAt: null,
            pausedRemaining: Math.max(0, remaining),
          };
        }
        break;
      }
      case "resetTimer": {
        state.timer = null;
        break;
      }
      case "reorderRiders": {
        const newRiders = action.order.map((i) => state.riders[i]);
        // Remap prelim statuses to new indices
        const newStatuses: Record<number, PrelimStatus> = {};
        for (const [newIdx, oldIdx] of action.order.entries()) {
          if (state.prelimStatuses[oldIdx]) {
            newStatuses[newIdx] = state.prelimStatuses[oldIdx];
          }
        }
        state.riders = newRiders;
        state.prelimStatuses = newStatuses;
        state.currentRiderIndex = null;
        state.timer = null;
        break;
      }
    }

    await updateTournamentState(tournament.id, tournament.code, tournament.phase, state);
    return { state };
  });

export const rankingActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(rankingActionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code);
    invariant(
      tournament.createdByUserId === context.user.id,
      "Not authorized",
    );

    const state = { ...tournament.state } as TournamentState;
    state.ranking = input.ranking;

    await updateTournamentState(tournament.id, tournament.code, tournament.phase, state);
    return { state };
  });

export const bracketActionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(bracketActionSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code);
    invariant(
      tournament.createdByUserId === context.user.id,
      "Not authorized",
    );

    const state = { ...tournament.state } as TournamentState;
    const { action } = input;

    switch (action.type) {
      case "selectWinner": {
        // Store winners as compact string using existing encode/decode
        const { encodeWinners, decodeWinners } = await import(
          "~/lib/tourney/bracket"
        );
        const { generateBracket, applyWinners } = await import(
          "~/lib/tourney/bracket-logic"
        );

        invariant(state.bracketRiders, "No bracket riders");
        const bracket = generateBracket(state.bracketRiders);
        const currentWinners = decodeWinners(state.winners ?? null);

        // Find match index in sorted order
        const sortedMatches = [...bracket].sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return a.position - b.position;
        });
        const matchIndex = sortedMatches.findIndex(
          (m) => m.id === action.matchId,
        );
        invariant(matchIndex !== -1, "Match not found");

        // Check for downstream clearing needed
        const match = sortedMatches[matchIndex];
        const previousWinner = currentWinners.get(matchIndex);
        if (previousWinner !== undefined && previousWinner !== action.winner) {
          // Clear downstream winners
          const totalRounds = Math.max(...bracket.map((m) => m.round));
          let currentRound = match.round;
          let currentPosition = match.position;
          while (currentRound < totalRounds) {
            const nextRound = currentRound + 1;
            const nextPosition = Math.floor(currentPosition / 2);
            const downstream = sortedMatches.find(
              (m) =>
                m.round === nextRound &&
                m.position === nextPosition &&
                m.id !== "3rd",
            );
            if (downstream) {
              const dsIdx = sortedMatches.indexOf(downstream);
              currentWinners.delete(dsIdx);
            }
            currentRound = nextRound;
            currentPosition = nextPosition;
          }
          // Clear 3rd place
          if (match.round <= totalRounds - 1) {
            const thirdPlace = sortedMatches.find((m) => m.id === "3rd");
            if (thirdPlace) {
              currentWinners.delete(sortedMatches.indexOf(thirdPlace));
            }
          }
        }

        currentWinners.set(matchIndex, action.winner);

        // Always clear the timer when selecting a winner so the live view
        // never shows a stale battle timer instead of the bracket/winner.
        state.timer = null;

        // Re-encode winners
        const applied = applyWinners(bracket, currentWinners);
        const encoded = encodeWinners(
          [...applied].sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round;
            return a.position - b.position;
          }),
        );
        state.winners = encoded;
        break;
      }
      case "resetBracket": {
        state.winners = null;
        state.timer = null;
        break;
      }
      case "openTimer": {
        state.timer = {
          active: false,
          riderIndex: null,
          matchId: action.matchId,
          side: null,
          startedAt: null,
          pausedRemaining: null,
          duration: action.duration,
          otherSideRemaining: null,
          swapped: false,
        };
        break;
      }
      case "startTimer": {
        let duration: number;
        if (action.duration != null) {
          duration = action.duration;
        } else {
          const { generateBracket } = await import(
            "~/lib/tourney/bracket-logic"
          );
          invariant(state.bracketRiders, "No bracket riders");
          const bracket = generateBracket(state.bracketRiders);
          const match = bracket.find((m) => m.id === action.matchId);
          const totalRounds = Math.max(...bracket.map((m) => m.round));
          duration =
            match?.round === totalRounds
              ? state.finalsTime
              : state.battleTime;
        }

        state.timer = {
          active: true,
          riderIndex: null,
          matchId: action.matchId,
          side: action.side,
          startedAt: Date.now(),
          pausedRemaining: null,
          duration,
          otherSideRemaining: action.otherRemaining ?? null,
          swapped: state.timer?.swapped ?? false,
        };
        break;
      }
      case "pauseTimer": {
        if (state.timer?.active && state.timer.startedAt) {
          const elapsed = Date.now() - state.timer.startedAt;
          const remaining = state.timer.duration * 1000 - elapsed;
          state.timer = {
            ...state.timer,
            active: false,
            startedAt: null,
            pausedRemaining: Math.max(0, remaining),
          };
        }
        break;
      }
      case "resetTimer": {
        state.timer = null;
        break;
      }
      case "softResetTimer": {
        if (state.timer) {
          state.timer = {
            ...state.timer,
            active: false,
            side: null,
            startedAt: null,
            pausedRemaining: null,
            otherSideRemaining: null,
          };
        }
        break;
      }
      case "swapSides": {
        if (state.timer) {
          state.timer = { ...state.timer, swapped: !state.timer.swapped };
        }
        break;
      }
    }

    await updateTournamentState(tournament.id, tournament.code, tournament.phase, state);
    return { state };
  });

export const advancePhaseServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(advancePhaseSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code);
    invariant(
      tournament.createdByUserId === context.user.id,
      "Not authorized",
    );

    const state = { ...tournament.state } as TournamentState;

    // Phase-specific transitions
    if (input.phase === "bracket" && !state.bracketRiders && state.ranking) {
      // Build bracket riders from ranking
      const topN = state.ranking.slice(0, state.bracketSize);
      state.bracketRiders = topN.map((i) => state.riders[i]);
      state.winners = null;
      state.timer = null;
    }

    await db
      .update(tournaments)
      .set({ phase: input.phase, state, updatedAt: new Date() })
      .where(eq(tournaments.id, tournament.id));

    publishTourneyUpdate(tournament.code, {
      phase: input.phase,
      state,
      updatedAt: Date.now(),
    });

    return { phase: input.phase, state };
  });

export const adminHeartbeatServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(adminHeartbeatSchema))
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
    const tournament = await getTournamentByCode(input.code);
    invariant(
      tournament.createdByUserId === context.user.id,
      "Not authorized",
    );
    publishAdminHeartbeat(tournament.code);
  });

function findNextPending(
  totalRiders: number,
  statuses: Record<number, PrelimStatus>,
  afterIndex: number,
): number | null {
  for (let i = afterIndex + 1; i < totalRiders; i++) {
    if (!statuses[i]) return i;
  }
  for (let i = 0; i <= afterIndex; i++) {
    if (!statuses[i]) return i;
  }
  return null;
}
