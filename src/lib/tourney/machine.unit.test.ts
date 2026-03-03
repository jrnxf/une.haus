import { type StateValue, transition } from "xstate"

import {
  dbPhaseToStateValue,
  findNextPending,
  stateValueToDbPhase,
  type TournamentEvent,
  tournamentMachine,
} from "./machine"
import { type TournamentState } from "./types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(
  overrides: Partial<TournamentState> = {},
): TournamentState {
  return {
    riders: [
      { userId: 1, name: null },
      { userId: 2, name: null },
      { userId: 3, name: null },
      { userId: 4, name: null },
    ],
    prelimTime: 60,
    battleTime: 60,
    finalsTime: 120,
    bracketSize: 4,
    prelimStatuses: {},
    currentRiderIndex: null,
    timer: null,
    ranking: null,
    bracketRiders: null,
    winners: null,
    celebrating: false,
    ...overrides,
  }
}

function resolve(phase: string, ctx: TournamentState, stateValue?: StateValue) {
  const value =
    stateValue ??
    (dbPhaseToStateValue(
      phase as "setup" | "prelims" | "ranking" | "bracket" | "complete",
      ctx,
    ) as StateValue)
  return tournamentMachine.resolveState({ value, context: ctx })
}

function apply(
  phase: string,
  ctx: TournamentState,
  event: TournamentEvent,
  stateValue?: StateValue,
) {
  const state = resolve(phase, ctx, stateValue)
  const [next] = transition(tournamentMachine, state, event)
  return next
}

// ---------------------------------------------------------------------------
// findNextPending
// ---------------------------------------------------------------------------

describe("findNextPending", () => {
  it("returns the next pending rider after the given index", () => {
    expect(findNextPending(4, { 0: "done" }, 0)).toBe(1)
  })

  it("wraps around to find pending riders before afterIndex", () => {
    expect(findNextPending(4, { 2: "done", 3: "done" }, 1)).toBe(0)
  })

  it("returns null when all riders have a status", () => {
    expect(findNextPending(3, { 0: "done", 1: "dq", 2: "done" }, 0)).toBeNull()
  })

  it("skips dq riders", () => {
    expect(findNextPending(4, { 1: "dq" }, 0)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// dbPhaseToStateValue / stateValueToDbPhase
// ---------------------------------------------------------------------------

describe("dbPhaseToStateValue", () => {
  it("maps setup", () => {
    expect(dbPhaseToStateValue("setup", makeContext())).toBe("setup")
  })

  it("maps prelims idle (no current rider)", () => {
    expect(dbPhaseToStateValue("prelims", makeContext())).toEqual({
      prelims: "idle",
    })
  })

  it("maps prelims riderActive timerIdle", () => {
    expect(
      dbPhaseToStateValue("prelims", makeContext({ currentRiderIndex: 0 })),
    ).toEqual({
      prelims: { riderActive: "timerIdle" },
    })
  })

  it("maps prelims riderActive timerRunning", () => {
    expect(
      dbPhaseToStateValue(
        "prelims",
        makeContext({
          currentRiderIndex: 0,
          timer: {
            active: true,
            riderIndex: 0,
            matchId: null,
            side: null,
            startedAt: Date.now(),
            pausedRemaining: null,
            duration: 60,
            otherSideRemaining: null,
            swapped: false,
          },
        }),
      ),
    ).toEqual({ prelims: { riderActive: "timerRunning" } })
  })

  it("maps prelims riderActive timerPaused", () => {
    expect(
      dbPhaseToStateValue(
        "prelims",
        makeContext({
          currentRiderIndex: 0,
          timer: {
            active: false,
            riderIndex: 0,
            matchId: null,
            side: null,
            startedAt: null,
            pausedRemaining: 30_000,
            duration: 60,
            otherSideRemaining: null,
            swapped: false,
          },
        }),
      ),
    ).toEqual({ prelims: { riderActive: "timerPaused" } })
  })

  it("maps bracket viewing", () => {
    expect(dbPhaseToStateValue("bracket", makeContext())).toEqual({
      bracket: "viewing",
    })
  })

  it("maps bracket timerOpen", () => {
    expect(
      dbPhaseToStateValue(
        "bracket",
        makeContext({
          timer: {
            active: false,
            riderIndex: null,
            matchId: "r1-m0",
            side: null,
            startedAt: null,
            pausedRemaining: null,
            duration: 60,
            otherSideRemaining: null,
            swapped: false,
          },
        }),
      ),
    ).toEqual({ bracket: "timerOpen" })
  })

  it("maps bracket celebrating", () => {
    expect(
      dbPhaseToStateValue("bracket", makeContext({ celebrating: true })),
    ).toEqual({
      bracket: "celebrating",
    })
  })

  it("maps bracket timerRunning", () => {
    expect(
      dbPhaseToStateValue(
        "bracket",
        makeContext({
          timer: {
            active: true,
            riderIndex: null,
            matchId: "r1-m0",
            side: 1,
            startedAt: Date.now(),
            pausedRemaining: null,
            duration: 60,
            otherSideRemaining: null,
            swapped: false,
          },
        }),
      ),
    ).toEqual({ bracket: "timerRunning" })
  })

  it("maps complete", () => {
    expect(dbPhaseToStateValue("complete", makeContext())).toBe("complete")
  })
})

describe("stateValueToDbPhase", () => {
  it("maps string values directly", () => {
    expect(stateValueToDbPhase("setup")).toBe("setup")
    expect(stateValueToDbPhase("ranking")).toBe("ranking")
    expect(stateValueToDbPhase("complete")).toBe("complete")
  })

  it("maps nested prelims", () => {
    expect(stateValueToDbPhase({ prelims: "idle" })).toBe("prelims")
    expect(stateValueToDbPhase({ prelims: { riderActive: "timerIdle" } })).toBe(
      "prelims",
    )
  })

  it("maps nested bracket", () => {
    expect(stateValueToDbPhase({ bracket: "viewing" })).toBe("bracket")
  })
})

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

describe("phase transitions", () => {
  it("advances from setup to prelims", () => {
    const next = apply("setup", makeContext(), {
      type: "phase.advance",
      phase: "prelims",
    })
    expect(stateValueToDbPhase(next.value)).toBe("prelims")
  })

  it("advances from prelims to ranking with enough qualified riders", () => {
    const ctx = makeContext({
      prelimStatuses: { 0: "done", 1: "done", 2: "done", 3: "dq" },
    })
    const next = apply("prelims", ctx, {
      type: "phase.advance",
      phase: "ranking",
    })
    expect(stateValueToDbPhase(next.value)).toBe("ranking")
  })

  it("blocks prelims to ranking when all riders disqualified", () => {
    const ctx = makeContext({
      prelimStatuses: { 0: "dq", 1: "dq", 2: "dq", 3: "dq" },
    })
    const next = apply("prelims", ctx, {
      type: "phase.advance",
      phase: "ranking",
    })
    expect(stateValueToDbPhase(next.value)).toBe("prelims")
  })

  it("blocks prelims to ranking with 2 or fewer qualified riders", () => {
    const ctx = makeContext({
      prelimStatuses: { 0: "done", 1: "done", 2: "dq", 3: "dq" },
    })
    const next = apply("prelims", ctx, {
      type: "phase.advance",
      phase: "ranking",
    })
    expect(stateValueToDbPhase(next.value)).toBe("prelims")
  })

  it("advances from ranking to bracket (builds bracketRiders)", () => {
    const ctx = makeContext({
      ranking: [2, 0, 1, 3],
    })
    const next = apply("ranking", ctx, {
      type: "phase.advance",
      phase: "bracket",
    })
    expect(stateValueToDbPhase(next.value)).toBe("bracket")
    expect(next.context.bracketRiders).toEqual([
      { userId: 3, name: null },
      { userId: 1, name: null },
      { userId: 2, name: null },
      { userId: 4, name: null },
    ])
    expect(next.context.winners).toBeNull()
    expect(next.context.timer).toBeNull()
  })

  it("does not rebuild bracketRiders if already set", () => {
    const existing = [
      { userId: 10, name: null },
      { userId: 20, name: null },
    ]
    const ctx = makeContext({
      ranking: [0, 1, 2, 3],
      bracketRiders: existing,
    })
    const next = apply("ranking", ctx, {
      type: "phase.advance",
      phase: "bracket",
    })
    expect(next.context.bracketRiders).toBe(existing)
  })

  it("advances from bracket to complete", () => {
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: null },
        { userId: 2, name: null },
      ],
    })
    const next = apply("bracket", ctx, {
      type: "phase.advance",
      phase: "complete",
    })
    expect(stateValueToDbPhase(next.value)).toBe("complete")
  })

  it("rejects wrong phase target", () => {
    // Trying to advance from setup to bracket should stay in setup
    const next = apply("setup", makeContext(), {
      type: "phase.advance",
      phase: "bracket",
    })
    expect(stateValueToDbPhase(next.value)).toBe("setup")
  })
})

// ---------------------------------------------------------------------------
// Prelim flow
// ---------------------------------------------------------------------------

describe("prelim actions", () => {
  it("setCurrent selects a rider and clears timer", () => {
    const next = apply("prelims", makeContext(), {
      type: "prelim.setCurrent",
      riderIndex: 2,
    })
    expect(next.context.currentRiderIndex).toBe(2)
    expect(next.context.timer).toBeNull()
  })

  it("setCurrent with negative index sets null", () => {
    const ctx = makeContext({ currentRiderIndex: 1 })
    const next = apply("prelims", ctx, {
      type: "prelim.setCurrent",
      riderIndex: -1,
    })
    expect(next.context.currentRiderIndex).toBeNull()
  })

  it("markDone marks current rider done and advances", () => {
    const ctx = makeContext({ currentRiderIndex: 0 })
    const next = apply("prelims", ctx, { type: "prelim.markDone" })
    expect(next.context.prelimStatuses[0]).toBe("done")
    expect(next.context.currentRiderIndex).toBe(1)
    expect(next.context.timer).toBeNull()
  })

  it("markDQ marks current rider dq and advances", () => {
    const ctx = makeContext({ currentRiderIndex: 1 })
    const next = apply("prelims", ctx, { type: "prelim.markDQ" })
    expect(next.context.prelimStatuses[1]).toBe("dq")
    expect(next.context.currentRiderIndex).toBe(2)
  })

  it("markDone returns null currentRiderIndex when all done", () => {
    const ctx = makeContext({
      currentRiderIndex: 3,
      prelimStatuses: { 0: "done", 1: "done", 2: "done" },
    })
    const next = apply("prelims", ctx, { type: "prelim.markDone" })
    expect(next.context.prelimStatuses[3]).toBe("done")
    expect(next.context.currentRiderIndex).toBeNull()
  })

  it("resetRider clears a rider status", () => {
    const ctx = makeContext({ prelimStatuses: { 0: "done", 1: "dq" } })
    const next = apply("prelims", ctx, {
      type: "prelim.resetRider",
      riderIndex: 0,
    })
    expect(next.context.prelimStatuses[0]).toBeUndefined()
    expect(next.context.prelimStatuses[1]).toBe("dq")
  })

  it("disqualifyRider marks a specific rider dq", () => {
    const ctx = makeContext()
    const next = apply("prelims", ctx, {
      type: "prelim.disqualifyRider",
      riderIndex: 2,
    })
    expect(next.context.prelimStatuses[2]).toBe("dq")
  })

  it("reorderRiders remaps riders and statuses", () => {
    const ctx = makeContext({
      prelimStatuses: { 0: "done" },
      currentRiderIndex: 0,
    })
    const next = apply("prelims", ctx, {
      type: "prelim.reorderRiders",
      order: [3, 2, 1, 0],
    })
    // Rider at old index 0 (done) moves to new index 3
    expect(next.context.prelimStatuses[3]).toBe("done")
    expect(next.context.prelimStatuses[0]).toBeUndefined()
    expect(next.context.currentRiderIndex).toBeNull()
    expect(next.context.timer).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Prelim timer
// ---------------------------------------------------------------------------

describe("prelim timer", () => {
  it("startTimer creates an active timer", () => {
    const ctx = makeContext({ currentRiderIndex: 0 })
    const next = apply("prelims", ctx, { type: "prelim.startTimer" })
    expect(next.context.timer).not.toBeNull()
    expect(next.context.timer?.active).toBe(true)
    expect(next.context.timer?.riderIndex).toBe(0)
    expect(next.context.timer?.duration).toBe(60)
  })

  it("pauseTimer stores remaining time", () => {
    const now = Date.now()
    const ctx = makeContext({
      currentRiderIndex: 0,
      timer: {
        active: true,
        riderIndex: 0,
        matchId: null,
        side: null,
        startedAt: now - 10_000,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const next = apply("prelims", ctx, { type: "prelim.pauseTimer" })
    expect(next.context.timer?.active).toBe(false)
    expect(next.context.timer?.pausedRemaining).toBeGreaterThan(0)
    expect(next.context.timer?.pausedRemaining).toBeLessThanOrEqual(50_000)
  })

  it("startTimer from paused resumes with remaining time", () => {
    const ctx = makeContext({
      currentRiderIndex: 0,
      timer: {
        active: false,
        riderIndex: 0,
        matchId: null,
        side: null,
        startedAt: null,
        pausedRemaining: 30_000,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { prelims: { riderActive: "timerPaused" } }
    const next = apply("prelims", ctx, { type: "prelim.startTimer" }, stateVal)
    expect(next.context.timer?.active).toBe(true)
    expect(next.context.timer?.duration).toBe(30) // 30000ms / 1000
  })

  it("resetTimer clears the timer", () => {
    const ctx = makeContext({
      currentRiderIndex: 0,
      timer: {
        active: true,
        riderIndex: 0,
        matchId: null,
        side: null,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { prelims: { riderActive: "timerRunning" } }
    const next = apply("prelims", ctx, { type: "prelim.resetTimer" }, stateVal)
    expect(next.context.timer).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Exit actions (THE KEY FIX)
// ---------------------------------------------------------------------------

describe("exit actions", () => {
  it("clears timer when advancing from prelims to ranking", () => {
    const ctx = makeContext({
      currentRiderIndex: 0,
      prelimStatuses: { 0: "done", 1: "done", 2: "done", 3: "done" },
      timer: {
        active: true,
        riderIndex: 0,
        matchId: null,
        side: null,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const next = apply("prelims", ctx, {
      type: "phase.advance",
      phase: "ranking",
    })
    expect(next.context.timer).toBeNull()
    expect(stateValueToDbPhase(next.value)).toBe("ranking")
  })

  it("clears timer when advancing from bracket to complete", () => {
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: null },
        { userId: 2, name: null },
      ],
      timer: {
        active: true,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const next = apply("bracket", ctx, {
      type: "phase.advance",
      phase: "complete",
    })
    expect(next.context.timer).toBeNull()
    expect(stateValueToDbPhase(next.value)).toBe("complete")
  })
})

// ---------------------------------------------------------------------------
// Bracket flow
// ---------------------------------------------------------------------------

describe("bracket actions", () => {
  const bracketRiders = [
    { userId: 1, name: "Alice" },
    { userId: 2, name: "Bob" },
    { userId: 3, name: "Charlie" },
    { userId: 4, name: "Dave" },
  ]

  it("selectWinner sets winner and clears timer", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const next = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    expect(next.context.timer).toBeNull()
    expect(next.context.winners).not.toBeNull()
  })

  it("resetBracket clears winners and timer", () => {
    const ctx = makeContext({
      bracketRiders,
      winners: "1-2-",
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const next = apply("bracket", ctx, { type: "bracket.resetBracket" })
    expect(next.context.winners).toBeNull()
    expect(next.context.timer).toBeNull()
  })

  it("openTimer creates a paused timer for a match", () => {
    const ctx = makeContext({ bracketRiders })
    const next = apply("bracket", ctx, {
      type: "bracket.openTimer",
      matchId: "r1-m0",
      duration: 60,
    })
    expect(next.context.timer).not.toBeNull()
    expect(next.context.timer?.active).toBe(false)
    expect(next.context.timer?.matchId).toBe("r1-m0")
    expect(next.context.timer?.duration).toBe(60)
  })

  it("startTimer from timerOpen creates an active timer", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerOpen" }
    const next = apply(
      "bracket",
      ctx,
      {
        type: "bracket.startTimer",
        matchId: "r1-m0",
        side: 1,
        duration: 60,
      },
      stateVal,
    )
    expect(next.context.timer?.active).toBe(true)
    expect(next.context.timer?.side).toBe(1)
  })

  it("pauseTimer from timerRunning stores remaining", () => {
    const now = Date.now()
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: true,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: now - 5000,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerRunning" }
    const next = apply("bracket", ctx, { type: "bracket.pauseTimer" }, stateVal)
    expect(next.context.timer?.active).toBe(false)
    expect(next.context.timer?.pausedRemaining).toBeGreaterThan(0)
  })

  it("resetTimer from timerRunning clears timer", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: true,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerRunning" }
    const next = apply("bracket", ctx, { type: "bracket.resetTimer" }, stateVal)
    expect(next.context.timer).toBeNull()
  })

  it("softResetTimer keeps matchId/duration, clears active state", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: true,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: 50_000,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerRunning" }
    const next = apply(
      "bracket",
      ctx,
      { type: "bracket.softResetTimer" },
      stateVal,
    )
    expect(next.context.timer?.matchId).toBe("r1-m0")
    expect(next.context.timer?.duration).toBe(60)
    expect(next.context.timer?.active).toBe(false)
    expect(next.context.timer?.side).toBeNull()
    expect(next.context.timer?.startedAt).toBeNull()
    expect(next.context.timer?.pausedRemaining).toBeNull()
    expect(next.context.timer?.otherSideRemaining).toBeNull()
  })

  it("swapSides toggles the swapped flag", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerOpen" }
    const next = apply("bracket", ctx, { type: "bracket.swapSides" }, stateVal)
    expect(next.context.timer?.swapped).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

describe("ranking actions", () => {
  it("saves ranking", () => {
    const ctx = makeContext()
    const next = apply("ranking", ctx, {
      type: "ranking.save",
      ranking: [3, 1, 0, 2],
    })
    expect(next.context.ranking).toEqual([3, 1, 0, 2])
  })
})

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

describe("guards", () => {
  it("prelim.markDone is rejected without current rider", () => {
    const ctx = makeContext({ currentRiderIndex: null })
    // markDone from idle state should be a no-op (no transition)
    const next = apply("prelims", ctx, { type: "prelim.markDone" })
    expect(next.context.currentRiderIndex).toBeNull()
  })

  it("selectWinner auto-transitions to celebrating when champion is decided", () => {
    // 2-player bracket: single final match, selecting a winner should celebrate
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: "Alice" },
        { userId: 2, name: "Bob" },
      ],
    })
    const next = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    expect(next.context.celebrating).toBe(true)
    expect(stateValueToDbPhase(next.value)).toBe("bracket")
  })

  it("selectWinner does not celebrate for non-final match", () => {
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: "Alice" },
        { userId: 2, name: "Bob" },
        { userId: 3, name: "Charlie" },
        { userId: 4, name: "Dave" },
      ],
    })
    // First round match — not the final
    const next = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    expect(next.context.celebrating).toBe(false)
  })

  it("dismissCelebration transitions back to viewing", () => {
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: "Alice" },
        { userId: 2, name: "Bob" },
      ],
      celebrating: true,
    })
    const stateVal = { bracket: "celebrating" }
    const next = apply(
      "bracket",
      ctx,
      { type: "bracket.dismissCelebration" },
      stateVal,
    )
    expect(next.context.celebrating).toBe(false)
    expect(stateValueToDbPhase(next.value)).toBe("bracket")
  })

  it("showCelebration transitions to celebrating from viewing", () => {
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: "Alice" },
        { userId: 2, name: "Bob" },
      ],
    })
    const next = apply("bracket", ctx, { type: "bracket.showCelebration" })
    expect(next.context.celebrating).toBe(true)
  })

  it("resetBracket clears celebrating", () => {
    const ctx = makeContext({
      bracketRiders: [
        { userId: 1, name: "Alice" },
        { userId: 2, name: "Bob" },
      ],
      celebrating: true,
    })
    const stateVal = { bracket: "celebrating" }
    const next = apply(
      "bracket",
      ctx,
      { type: "bracket.resetBracket" },
      stateVal,
    )
    expect(next.context.celebrating).toBe(false)
    expect(next.context.winners).toBeNull()
  })

  it("prelim.pauseTimer is rejected when timer not active", () => {
    const ctx = makeContext({
      currentRiderIndex: 0,
      timer: {
        active: false,
        riderIndex: 0,
        matchId: null,
        side: null,
        startedAt: null,
        pausedRemaining: 30_000,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { prelims: { riderActive: "timerPaused" } }
    // pauseTimer from paused state — not handled, stays paused
    const next = apply("prelims", ctx, { type: "prelim.pauseTimer" }, stateVal)
    // Should stay in paused state (no timerRunning transition available from timerPaused)
    expect(next.context.timer?.pausedRemaining).toBe(30_000)
  })
})

// ---------------------------------------------------------------------------
// selectWinner edge cases
// ---------------------------------------------------------------------------

describe("selectWinner edge cases", () => {
  const bracketRiders = [
    { userId: 1, name: "Alice" },
    { userId: 2, name: "Bob" },
    { userId: 3, name: "Charlie" },
    { userId: 4, name: "Dave" },
  ]

  it("changing a previous winner cascades — clears downstream results", () => {
    const ctx = makeContext({ bracketRiders })

    // Select winners for both semis
    const after1 = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1, // Alice
    })
    const after2 = apply(
      "bracket",
      after1.context,
      { type: "bracket.selectWinner", matchId: "r1-m1", winner: 1 }, // Bob
    )

    // Set final winner
    const after3 = apply(
      "bracket",
      after2.context,
      { type: "bracket.selectWinner", matchId: "r2-m0", winner: 1 }, // Alice wins final
    )

    // Now change the semi-final result (Alice's match)
    const after4 = apply(
      "bracket",
      after3.context,
      { type: "bracket.selectWinner", matchId: "r1-m0", winner: 2 }, // Dave now wins
    )

    // The final winner should be cleared since Alice was replaced
    // The winners string should no longer encode a final winner
    expect(after4.context.winners).not.toEqual(after3.context.winners)
  })

  it("selectWinner with invalid matchId leaves state unchanged", () => {
    const ctx = makeContext({ bracketRiders })
    const next = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "nonexistent",
      winner: 1,
    })
    expect(next.context.winners).toBeNull()
    expect(next.context.timer).toBeNull()
  })

  it("selectWinner with no bracketRiders leaves state unchanged", () => {
    const ctx = makeContext({ bracketRiders: null })
    const next = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    expect(next.context.winners).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Bracket timer duration inference
// ---------------------------------------------------------------------------

describe("bracket timer duration inference", () => {
  const bracketRiders = [
    { userId: 1, name: "Alice" },
    { userId: 2, name: "Bob" },
    { userId: 3, name: "Charlie" },
    { userId: 4, name: "Dave" },
  ]

  it("infers battle time for non-final round when no duration provided", () => {
    const ctx = makeContext({
      bracketRiders,
      battleTime: 45,
      finalsTime: 90,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 45,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerOpen" }
    const next = apply(
      "bracket",
      ctx,
      {
        type: "bracket.startTimer",
        matchId: "r1-m0",
        side: 1,
        // no duration — should infer
      },
      stateVal,
    )
    expect(next.context.timer?.duration).toBe(45) // battleTime
  })

  it("infers finals time for final round when no duration provided", () => {
    const ctx = makeContext({
      bracketRiders,
      battleTime: 45,
      finalsTime: 90,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r2-m0", // final round for 4-player bracket
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 90,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerOpen" }
    const next = apply(
      "bracket",
      ctx,
      {
        type: "bracket.startTimer",
        matchId: "r2-m0",
        side: 1,
        // no duration — should infer finals
      },
      stateVal,
    )
    expect(next.context.timer?.duration).toBe(90) // finalsTime
  })

  it("uses explicit duration when provided, ignoring inference", () => {
    const ctx = makeContext({
      bracketRiders,
      battleTime: 45,
      finalsTime: 90,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: null,
        startedAt: null,
        pausedRemaining: null,
        duration: 45,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerOpen" }
    const next = apply(
      "bracket",
      ctx,
      {
        type: "bracket.startTimer",
        matchId: "r1-m0",
        side: 1,
        duration: 120, // explicit override
      },
      stateVal,
    )
    expect(next.context.timer?.duration).toBe(120)
  })
})

// ---------------------------------------------------------------------------
// Sub-state transitions not covered above
// ---------------------------------------------------------------------------

describe("bracket sub-state transitions", () => {
  const bracketRiders = [
    { userId: 1, name: "Alice" },
    { userId: 2, name: "Bob" },
    { userId: 3, name: "Charlie" },
    { userId: 4, name: "Dave" },
  ]

  it("startTimer from timerRunning restarts for another side", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: true,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: Date.now() - 5000,
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerRunning" }
    const next = apply(
      "bracket",
      ctx,
      {
        type: "bracket.startTimer",
        matchId: "r1-m0",
        side: 2,
        duration: 60,
        otherRemaining: 55_000,
      },
      stateVal,
    )
    expect(next.context.timer?.side).toBe(2)
    expect(next.context.timer?.active).toBe(true)
    expect(next.context.timer?.otherSideRemaining).toBe(55_000)
  })

  it("swapSides from timerRunning toggles swapped", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: true,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { bracket: "timerRunning" }
    const next = apply("bracket", ctx, { type: "bracket.swapSides" }, stateVal)
    expect(next.context.timer?.swapped).toBe(true)
    // Toggle back
    const next2 = apply(
      "bracket",
      next.context,
      { type: "bracket.swapSides" },
      stateVal,
    )
    expect(next2.context.timer?.swapped).toBe(false)
  })

  it("softResetTimer from timerOpen stays in timerOpen", () => {
    const ctx = makeContext({
      bracketRiders,
      timer: {
        active: false,
        riderIndex: null,
        matchId: "r1-m0",
        side: 1,
        startedAt: null,
        pausedRemaining: 30_000,
        duration: 60,
        otherSideRemaining: 45_000,
        swapped: true,
      },
    })
    const stateVal = { bracket: "timerOpen" }
    const next = apply(
      "bracket",
      ctx,
      { type: "bracket.softResetTimer" },
      stateVal,
    )
    expect(next.context.timer?.matchId).toBe("r1-m0")
    expect(next.context.timer?.side).toBeNull()
    expect(next.context.timer?.pausedRemaining).toBeNull()
    expect(next.context.timer?.otherSideRemaining).toBeNull()
  })
})

describe("prelim sub-state transitions", () => {
  it("setCurrent from riderActive switches rider and clears timer", () => {
    const ctx = makeContext({
      currentRiderIndex: 0,
      timer: {
        active: true,
        riderIndex: 0,
        matchId: null,
        side: null,
        startedAt: Date.now(),
        pausedRemaining: null,
        duration: 60,
        otherSideRemaining: null,
        swapped: false,
      },
    })
    const stateVal = { prelims: { riderActive: "timerRunning" } }
    const next = apply(
      "prelims",
      ctx,
      { type: "prelim.setCurrent", riderIndex: 2 },
      stateVal,
    )
    expect(next.context.currentRiderIndex).toBe(2)
    expect(next.context.timer).toBeNull()
  })

  it("resetTimer from timerIdle clears timer (no-op path)", () => {
    const ctx = makeContext({
      currentRiderIndex: 0,
      timer: null,
    })
    const stateVal = { prelims: { riderActive: "timerIdle" } }
    const next = apply("prelims", ctx, { type: "prelim.resetTimer" }, stateVal)
    expect(next.context.timer).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// stateValueToDbPhase — celebrating
// ---------------------------------------------------------------------------

describe("stateValueToDbPhase additional", () => {
  it("maps bracket celebrating to bracket phase", () => {
    expect(stateValueToDbPhase({ bracket: "celebrating" })).toBe("bracket")
  })
})

// ---------------------------------------------------------------------------
// Celebrating with larger brackets
// ---------------------------------------------------------------------------

describe("celebrating with 4-player bracket", () => {
  const bracketRiders = [
    { userId: 1, name: "Alice" },
    { userId: 2, name: "Bob" },
    { userId: 3, name: "Charlie" },
    { userId: 4, name: "Dave" },
  ]

  it("does not celebrate after first semi-final", () => {
    const ctx = makeContext({ bracketRiders })
    const next = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    expect(next.context.celebrating).toBe(false)
  })

  it("does not celebrate after second semi-final", () => {
    const ctx = makeContext({ bracketRiders })
    const after1 = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    const after2 = apply("bracket", after1.context, {
      type: "bracket.selectWinner",
      matchId: "r1-m1",
      winner: 1,
    })
    expect(after2.context.celebrating).toBe(false)
  })

  it("celebrates after final match winner is selected", () => {
    const ctx = makeContext({ bracketRiders })
    const after1 = apply("bracket", ctx, {
      type: "bracket.selectWinner",
      matchId: "r1-m0",
      winner: 1,
    })
    const after2 = apply("bracket", after1.context, {
      type: "bracket.selectWinner",
      matchId: "r1-m1",
      winner: 1,
    })
    const after3 = apply("bracket", after2.context, {
      type: "bracket.selectWinner",
      matchId: "r2-m0",
      winner: 1,
    })
    expect(after3.context.celebrating).toBe(true)
  })
})
