import { assign, setup, transition } from "xstate";

import { decodeWinners, encodeWinners } from "~/lib/tourney/bracket";
import { applyWinners, generateBracket } from "~/lib/tourney/bracket-logic";
import type {
  PrelimStatus,
  TournamentPhase,
  TournamentState,
} from "~/lib/tourney/types";

// ---------------------------------------------------------------------------
// Event types – map 1:1 from Zod action schemas
// ---------------------------------------------------------------------------

type PrelimSetCurrentEvent = {
  type: "prelim.setCurrent";
  riderIndex: number;
};
type PrelimMarkDoneEvent = { type: "prelim.markDone" };
type PrelimMarkDQEvent = { type: "prelim.markDQ" };
type PrelimResetRiderEvent = {
  type: "prelim.resetRider";
  riderIndex: number;
};
type PrelimDisqualifyRiderEvent = {
  type: "prelim.disqualifyRider";
  riderIndex: number;
};
type PrelimStartTimerEvent = { type: "prelim.startTimer" };
type PrelimPauseTimerEvent = { type: "prelim.pauseTimer" };
type PrelimResetTimerEvent = { type: "prelim.resetTimer" };
type PrelimReorderRidersEvent = {
  type: "prelim.reorderRiders";
  order: number[];
};

type RankingSaveEvent = { type: "ranking.save"; ranking: number[] };

type BracketSelectWinnerEvent = {
  type: "bracket.selectWinner";
  matchId: string;
  winner: 1 | 2;
};
type BracketResetBracketEvent = { type: "bracket.resetBracket" };
type BracketOpenTimerEvent = {
  type: "bracket.openTimer";
  matchId: string;
  duration: number;
};
type BracketStartTimerEvent = {
  type: "bracket.startTimer";
  matchId: string;
  side: 1 | 2;
  duration?: number;
  otherRemaining?: number;
};
type BracketPauseTimerEvent = { type: "bracket.pauseTimer" };
type BracketResetTimerEvent = { type: "bracket.resetTimer" };
type BracketSoftResetTimerEvent = { type: "bracket.softResetTimer" };
type BracketSwapSidesEvent = { type: "bracket.swapSides" };
type BracketShowCelebrationEvent = { type: "bracket.showCelebration" };
type BracketDismissCelebrationEvent = { type: "bracket.dismissCelebration" };

type PhaseAdvanceEvent = {
  type: "phase.advance";
  phase: TournamentPhase;
};

export type TournamentEvent =
  | PrelimSetCurrentEvent
  | PrelimMarkDoneEvent
  | PrelimMarkDQEvent
  | PrelimResetRiderEvent
  | PrelimDisqualifyRiderEvent
  | PrelimStartTimerEvent
  | PrelimPauseTimerEvent
  | PrelimResetTimerEvent
  | PrelimReorderRidersEvent
  | RankingSaveEvent
  | BracketSelectWinnerEvent
  | BracketResetBracketEvent
  | BracketOpenTimerEvent
  | BracketStartTimerEvent
  | BracketPauseTimerEvent
  | BracketResetTimerEvent
  | BracketSoftResetTimerEvent
  | BracketSwapSidesEvent
  | BracketShowCelebrationEvent
  | BracketDismissCelebrationEvent
  | PhaseAdvanceEvent;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findNextPending(
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

function pauseTimerContext(state: TournamentState): TournamentState["timer"] {
  if (!state.timer?.active || !state.timer.startedAt) return state.timer;
  const elapsed = Date.now() - state.timer.startedAt;
  const remaining = state.timer.duration * 1000 - elapsed;
  return {
    ...state.timer,
    active: false,
    startedAt: null,
    pausedRemaining: Math.max(0, remaining),
  };
}

function selectWinnerContext(
  state: TournamentState,
  matchId: string,
  winner: 1 | 2,
): TournamentState {
  if (!state.bracketRiders) return state;

  const bracket = generateBracket(state.bracketRiders);
  const currentWinners = decodeWinners(state.winners ?? null);

  const sortedMatches = [...bracket].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });
  const matchIndex = sortedMatches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) return state;

  const match = sortedMatches[matchIndex];
  const previousWinner = currentWinners.get(matchIndex);
  if (previousWinner !== undefined && previousWinner !== winner) {
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
        currentWinners.delete(sortedMatches.indexOf(downstream));
      }
      currentRound = nextRound;
      currentPosition = nextPosition;
    }
    if (match.round <= totalRounds - 1) {
      const thirdPlace = sortedMatches.find((m) => m.id === "3rd");
      if (thirdPlace) {
        currentWinners.delete(sortedMatches.indexOf(thirdPlace));
      }
    }
  }

  currentWinners.set(matchIndex, winner);

  const applied = applyWinners(bracket, currentWinners);
  const encoded = encodeWinners(
    [...applied].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.position - b.position;
    }),
  );

  return { ...state, winners: encoded, timer: null };
}

function hasChampionAfterSelect(
  state: TournamentState,
  matchId: string,
  winner: 1 | 2,
): boolean {
  const updated = selectWinnerContext(state, matchId, winner);
  if (!updated.bracketRiders) return false;
  const bracket = generateBracket(updated.bracketRiders);
  const winners = decodeWinners(updated.winners ?? null);
  const applied = applyWinners(bracket, winners);
  const totalRounds = Math.max(...applied.map((m) => m.round), 0);
  const finalMatch = applied.find(
    (m) => m.round === totalRounds && m.id !== "3rd",
  );
  if (!finalMatch) return false;
  const championName =
    finalMatch.winner === 1
      ? finalMatch.player1?.name
      : finalMatch.winner === 2
        ? finalMatch.player2?.name
        : null;
  return !!championName && championName !== "bye";
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const tournamentMachine = setup({
  types: {} as {
    context: TournamentState;
    events: TournamentEvent;
    input: TournamentState;
  },
  guards: {
    hasCurrentRider: ({ context }) => context.currentRiderIndex !== null,
    timerIsActive: ({ context }) =>
      context.timer?.active === true && context.timer.startedAt !== null,
    hasTimer: ({ context }) => context.timer !== null,
    selectWinnerProducesChampion: ({ context, event }) => {
      const e = event as BracketSelectWinnerEvent;
      return hasChampionAfterSelect(context, e.matchId, e.winner);
    },
  },
  actions: {
    clearTimer: assign({ timer: null }),
  },
}).createMachine({
  id: "tournament",
  context: ({ input }: { input: TournamentState }) => input,
  initial: "setup",
  states: {
    setup: {
      on: {
        "phase.advance": {
          target: "prelims",
          guard: ({ event }) => event.type === "phase.advance" && event.phase === "prelims",
        },
      },
    },

    prelims: {
      initial: "idle",
      exit: "clearTimer",
      on: {
        "phase.advance": {
          target: "ranking",
          guard: ({ event }) => event.type === "phase.advance" && event.phase === "ranking",
        },
        "prelim.resetRider": {
          actions: assign({
            prelimStatuses: ({ context, event }) => {
              const e = event as PrelimResetRiderEvent;
              const copy = { ...context.prelimStatuses };
              delete copy[e.riderIndex];
              return copy;
            },
          }),
        },
        "prelim.disqualifyRider": {
          actions: assign({
            prelimStatuses: ({ context, event }) => {
              const e = event as PrelimDisqualifyRiderEvent;
              return { ...context.prelimStatuses, [e.riderIndex]: "dq" as const };
            },
          }),
        },
        "prelim.reorderRiders": {
          actions: assign(({ context, event }) => {
            const e = event as PrelimReorderRidersEvent;
            const newRiders = e.order.map((i) => context.riders[i]);
            const newStatuses: Record<number, PrelimStatus> = {};
            for (const [newIdx, oldIdx] of e.order.entries()) {
              if (context.prelimStatuses[oldIdx]) {
                newStatuses[newIdx] = context.prelimStatuses[oldIdx];
              }
            }
            return {
              riders: newRiders,
              prelimStatuses: newStatuses,
              currentRiderIndex: null,
              timer: null,
            };
          }),
          target: ".idle",
        },
      },
      states: {
        idle: {
          on: {
            "prelim.setCurrent": {
              target: "riderActive",
              actions: assign({
                currentRiderIndex: ({ event }) => {
                  const e = event as PrelimSetCurrentEvent;
                  return e.riderIndex >= 0 ? e.riderIndex : null;
                },
                timer: null,
              }),
            },
          },
        },
        riderActive: {
          initial: "timerIdle",
          on: {
            "prelim.setCurrent": {
              target: "riderActive",
              actions: assign({
                currentRiderIndex: ({ event }) => {
                  const e = event as PrelimSetCurrentEvent;
                  return e.riderIndex >= 0 ? e.riderIndex : null;
                },
                timer: null,
              }),
            },
            "prelim.markDone": {
              guard: "hasCurrentRider",
              actions: assign(({ context }) => {
                const idx = context.currentRiderIndex!;
                const newStatuses = { ...context.prelimStatuses, [idx]: "done" as const };
                const nextIndex = findNextPending(
                  context.riders.length,
                  newStatuses,
                  idx,
                );
                return {
                  prelimStatuses: newStatuses,
                  currentRiderIndex: nextIndex,
                  timer: null,
                };
              }),
              target: "riderActive",
            },
            "prelim.markDQ": {
              guard: "hasCurrentRider",
              actions: assign(({ context }) => {
                const idx = context.currentRiderIndex!;
                const newStatuses = { ...context.prelimStatuses, [idx]: "dq" as const };
                const nextIndex = findNextPending(
                  context.riders.length,
                  newStatuses,
                  idx,
                );
                return {
                  prelimStatuses: newStatuses,
                  currentRiderIndex: nextIndex,
                  timer: null,
                };
              }),
              target: "riderActive",
            },
          },
          states: {
            timerIdle: {
              on: {
                "prelim.startTimer": {
                  target: "timerRunning",
                  actions: assign(({ context }) => {
                    const remaining = context.timer?.pausedRemaining ?? null;
                    return {
                      timer: {
                        active: true,
                        riderIndex: context.currentRiderIndex,
                        matchId: null,
                        side: null,
                        startedAt: Date.now(),
                        pausedRemaining: null,
                        duration: remaining ? remaining / 1000 : context.prelimTime,
                        otherSideRemaining: null,
                        swapped: false,
                      },
                    };
                  }),
                },
                "prelim.resetTimer": {
                  actions: "clearTimer",
                },
              },
            },
            timerRunning: {
              on: {
                "prelim.pauseTimer": {
                  target: "timerPaused",
                  guard: "timerIsActive",
                  actions: assign(({ context }) => ({
                    timer: pauseTimerContext(context),
                  })),
                },
                "prelim.resetTimer": {
                  target: "timerIdle",
                  actions: "clearTimer",
                },
              },
            },
            timerPaused: {
              on: {
                "prelim.startTimer": {
                  target: "timerRunning",
                  actions: assign(({ context }) => {
                    const remaining = context.timer?.pausedRemaining ?? null;
                    return {
                      timer: {
                        active: true,
                        riderIndex: context.currentRiderIndex,
                        matchId: null,
                        side: null,
                        startedAt: Date.now(),
                        pausedRemaining: null,
                        duration: remaining ? remaining / 1000 : context.prelimTime,
                        otherSideRemaining: null,
                        swapped: false,
                      },
                    };
                  }),
                },
                "prelim.resetTimer": {
                  target: "timerIdle",
                  actions: "clearTimer",
                },
              },
            },
          },
        },
      },
    },

    ranking: {
      on: {
        "ranking.save": {
          actions: assign({
            ranking: ({ event }) => (event as RankingSaveEvent).ranking,
          }),
        },
        "phase.advance": [
          {
            target: "bracket",
            guard: ({ event }) => event.type === "phase.advance" && event.phase === "bracket",
            actions: assign(({ context }) => {
              if (!context.bracketRiders && context.ranking) {
                const topN = context.ranking.slice(0, context.bracketSize);
                return {
                  bracketRiders: topN.map((i) => context.riders[i]),
                  winners: null,
                  timer: null,
                };
              }
              return {};
            }),
          },
        ],
      },
    },

    bracket: {
      initial: "viewing",
      exit: "clearTimer",
      on: {
        "phase.advance": {
          target: "complete",
          guard: ({ event }) => event.type === "phase.advance" && event.phase === "complete",
        },
        "bracket.selectWinner": [
          {
            guard: "selectWinnerProducesChampion",
            actions: assign(({ context, event }) => {
              const e = event as BracketSelectWinnerEvent;
              const updated = selectWinnerContext(context, e.matchId, e.winner);
              return { winners: updated.winners, timer: updated.timer, celebrating: true };
            }),
            target: ".celebrating",
          },
          {
            actions: assign(({ context, event }) => {
              const e = event as BracketSelectWinnerEvent;
              const updated = selectWinnerContext(context, e.matchId, e.winner);
              return { winners: updated.winners, timer: updated.timer };
            }),
            target: ".viewing",
          },
        ],
        "bracket.resetBracket": {
          actions: assign({ winners: null, timer: null, celebrating: false }),
          target: ".viewing",
        },
      },
      states: {
        viewing: {
          on: {
            "bracket.openTimer": {
              target: "timerOpen",
              actions: assign(({ event }) => {
                const e = event as BracketOpenTimerEvent;
                return {
                  timer: {
                    active: false,
                    riderIndex: null,
                    matchId: e.matchId,
                    side: null,
                    startedAt: null,
                    pausedRemaining: null,
                    duration: e.duration,
                    otherSideRemaining: null,
                    swapped: false,
                  },
                };
              }),
            },
            "bracket.showCelebration": {
              target: "celebrating",
              actions: assign({ celebrating: true }),
            },
          },
        },
        timerOpen: {
          on: {
            "bracket.startTimer": {
              target: "timerRunning",
              actions: assign(({ context, event }) => {
                const e = event as BracketStartTimerEvent;
                let duration: number;
                if (e.duration != null) {
                  duration = e.duration;
                } else if (context.bracketRiders) {
                  const bracket = generateBracket(context.bracketRiders);
                  const match = bracket.find((m) => m.id === e.matchId);
                  const totalRounds = Math.max(...bracket.map((m) => m.round));
                  duration =
                    match?.round === totalRounds
                      ? context.finalsTime
                      : context.battleTime;
                } else {
                  duration = context.battleTime;
                }
                return {
                  timer: {
                    active: true,
                    riderIndex: null,
                    matchId: e.matchId,
                    side: e.side,
                    startedAt: Date.now(),
                    pausedRemaining: null,
                    duration,
                    otherSideRemaining: e.otherRemaining ?? null,
                    swapped: context.timer?.swapped ?? false,
                  },
                };
              }),
            },
            "bracket.resetTimer": {
              target: "viewing",
              actions: "clearTimer",
            },
            "bracket.softResetTimer": {
              actions: assign(({ context }) => {
                if (!context.timer) return {};
                return {
                  timer: {
                    ...context.timer,
                    active: false,
                    side: null,
                    startedAt: null,
                    pausedRemaining: null,
                    otherSideRemaining: null,
                  },
                };
              }),
            },
            "bracket.swapSides": {
              actions: assign(({ context }) => {
                if (!context.timer) return {};
                return {
                  timer: { ...context.timer, swapped: !context.timer.swapped },
                };
              }),
            },
          },
        },
        timerRunning: {
          on: {
            "bracket.startTimer": {
              actions: assign(({ context, event }) => {
                const e = event as BracketStartTimerEvent;
                let duration: number;
                if (e.duration != null) {
                  duration = e.duration;
                } else if (context.bracketRiders) {
                  const bracket = generateBracket(context.bracketRiders);
                  const match = bracket.find((m) => m.id === e.matchId);
                  const totalRounds = Math.max(...bracket.map((m) => m.round));
                  duration =
                    match?.round === totalRounds
                      ? context.finalsTime
                      : context.battleTime;
                } else {
                  duration = context.battleTime;
                }
                return {
                  timer: {
                    active: true,
                    riderIndex: null,
                    matchId: e.matchId,
                    side: e.side,
                    startedAt: Date.now(),
                    pausedRemaining: null,
                    duration,
                    otherSideRemaining: e.otherRemaining ?? null,
                    swapped: context.timer?.swapped ?? false,
                  },
                };
              }),
            },
            "bracket.pauseTimer": {
              target: "timerOpen",
              guard: "timerIsActive",
              actions: assign(({ context }) => ({
                timer: pauseTimerContext(context),
              })),
            },
            "bracket.resetTimer": {
              target: "viewing",
              actions: "clearTimer",
            },
            "bracket.softResetTimer": {
              target: "timerOpen",
              actions: assign(({ context }) => {
                if (!context.timer) return {};
                return {
                  timer: {
                    ...context.timer,
                    active: false,
                    side: null,
                    startedAt: null,
                    pausedRemaining: null,
                    otherSideRemaining: null,
                  },
                };
              }),
            },
            "bracket.swapSides": {
              actions: assign(({ context }) => {
                if (!context.timer) return {};
                return {
                  timer: { ...context.timer, swapped: !context.timer.swapped },
                };
              }),
            },
          },
        },
        celebrating: {
          on: {
            "bracket.dismissCelebration": {
              target: "viewing",
              actions: assign({ celebrating: false }),
            },
          },
        },
      },
    },

    complete: {
      type: "final",
    },
  },
});

// ---------------------------------------------------------------------------
// DB ↔ state value mapping
// ---------------------------------------------------------------------------

type TournamentStateValue =
  | "setup"
  | { prelims: "idle" | { riderActive: "timerIdle" | "timerRunning" | "timerPaused" } }
  | "ranking"
  | { bracket: "viewing" | "timerOpen" | "timerRunning" | "celebrating" }
  | "complete";

export function dbPhaseToStateValue(
  phase: TournamentPhase,
  state: TournamentState,
): TournamentStateValue {
  switch (phase) {
    case "setup": {
      return "setup";
    }
    case "prelims": {
      if (state.currentRiderIndex === null) {
        return { prelims: "idle" };
      }
      if (state.timer?.active && state.timer.startedAt) {
        return { prelims: { riderActive: "timerRunning" } };
      }
      if (state.timer?.pausedRemaining != null) {
        return { prelims: { riderActive: "timerPaused" } };
      }
      return { prelims: { riderActive: "timerIdle" } };
    }
    case "ranking": {
      return "ranking";
    }
    case "bracket": {
      if (state.celebrating) {
        return { bracket: "celebrating" };
      }
      if (state.timer?.active && state.timer.startedAt) {
        return { bracket: "timerRunning" };
      }
      if (state.timer?.matchId) {
        return { bracket: "timerOpen" };
      }
      return { bracket: "viewing" };
    }
    case "complete": {
      return "complete";
    }
  }
}

export function stateValueToDbPhase(
  value: TournamentStateValue,
): TournamentPhase {
  if (typeof value === "string") return value as TournamentPhase;
  if ("prelims" in value) return "prelims";
  if ("bracket" in value) return "bracket";
  return "setup";
}

// ---------------------------------------------------------------------------
// Server-side apply helper
// ---------------------------------------------------------------------------

export function applyMachineEvent(
  phase: TournamentPhase,
  state: TournamentState,
  event: TournamentEvent,
): { phase: TournamentPhase; state: TournamentState } {
  const stateValue = dbPhaseToStateValue(phase, state);
  const resolved = tournamentMachine.resolveState({
    value: stateValue,
    context: state,
  });
  const [next] = transition(tournamentMachine, resolved, event);
  return {
    phase: stateValueToDbPhase(next.value as TournamentStateValue),
    state: next.context,
  };
}
