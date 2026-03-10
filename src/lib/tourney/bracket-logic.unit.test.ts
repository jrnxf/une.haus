import { type ResolvedRiderEntry } from "./bracket"
import {
  applyWinners,
  BYE_ENTRY,
  generateBracket,
  getRiderName,
  getTimerDuration,
  getWinnerName,
  isBye,
  type Match,
} from "./bracket-logic"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rider(name: string, userId?: number): ResolvedRiderEntry {
  return { userId: userId ?? null, name }
}

function sortedMatches(matches: Match[]) {
  return [...matches].toSorted((a, b) => {
    if (a.round !== b.round) return a.round - b.round
    return a.position - b.position
  })
}

// ---------------------------------------------------------------------------
// isBye / getRiderName / getWinnerName / getTimerDuration
// ---------------------------------------------------------------------------

describe("isBye", () => {
  it("returns true for BYE_ENTRY", () => {
    expect(isBye(BYE_ENTRY)).toBe(true)
  })

  it("returns true for any rider named bye", () => {
    expect(isBye({ userId: null, name: "bye" })).toBe(true)
  })

  it("returns false for a real rider", () => {
    expect(isBye(rider("Alice"))).toBe(false)
  })

  it("returns false for null", () => {
    expect(isBye(null)).toBe(false)
  })
})

describe("getRiderName", () => {
  it("returns name from rider", () => {
    expect(getRiderName(rider("Alice"))).toBe("Alice")
  })

  it("returns null for null rider", () => {
    expect(getRiderName(null)).toBeNull()
  })

  it("returns null for rider with null name", () => {
    expect(getRiderName({ userId: 1, name: null })).toBeNull()
  })
})

describe("getWinnerName", () => {
  it("returns player1 name when winner is 1", () => {
    const match: Match = {
      id: "test",
      round: 1,
      position: 0,
      player1: rider("Alice"),
      player2: rider("Bob"),
      player1Seed: 1,
      player2Seed: 2,
      winner: 1,
    }
    expect(getWinnerName(match)).toBe("Alice")
  })

  it("returns player2 name when winner is 2", () => {
    const match: Match = {
      id: "test",
      round: 1,
      position: 0,
      player1: rider("Alice"),
      player2: rider("Bob"),
      player1Seed: 1,
      player2Seed: 2,
      winner: 2,
    }
    expect(getWinnerName(match)).toBe("Bob")
  })

  it("returns null when no winner", () => {
    const match: Match = {
      id: "test",
      round: 1,
      position: 0,
      player1: rider("Alice"),
      player2: rider("Bob"),
      player1Seed: 1,
      player2Seed: 2,
      winner: null,
    }
    expect(getWinnerName(match)).toBeNull()
  })
})

describe("getTimerDuration", () => {
  it("returns finals time for the final round", () => {
    expect(getTimerDuration(3, 3, { battle: 60, finals: 120 })).toBe(120)
  })

  it("returns battle time for non-final rounds", () => {
    expect(getTimerDuration(1, 3, { battle: 60, finals: 120 })).toBe(60)
    expect(getTimerDuration(2, 3, { battle: 60, finals: 120 })).toBe(60)
  })
})

// ---------------------------------------------------------------------------
// generateBracket — structure
// ---------------------------------------------------------------------------

describe("generateBracket structure", () => {
  it("returns empty for fewer than 2 participants", () => {
    expect(generateBracket([rider("Solo")])).toEqual([])
    expect(generateBracket([])).toEqual([])
  })

  it("generates a single match for 2 participants", () => {
    const matches = generateBracket([rider("Alice"), rider("Bob")])
    expect(matches).toHaveLength(1)
    expect(matches[0].round).toBe(1)
    expect(matches[0].player1?.name).toBe("Alice")
    expect(matches[0].player2?.name).toBe("Bob")
  })

  it("generates correct number of matches for 4 participants", () => {
    const matches = generateBracket([
      rider("A"),
      rider("B"),
      rider("C"),
      rider("D"),
    ])
    // 4 players: 2 first-round + 1 final + 1 third-place = 4
    expect(matches).toHaveLength(4)
    const rounds = [...new Set(matches.map((m) => m.round))]
    expect(rounds.toSorted()).toEqual([1, 2])
  })

  it("generates correct number of matches for 8 participants", () => {
    const participants = Array.from({ length: 8 }, (_, i) => rider(`P${i + 1}`))
    const matches = generateBracket(participants)
    // 8 players: 4 R1 + 2 R2 + 1 final + 1 third-place = 8
    expect(matches).toHaveLength(8)
  })
})

// ---------------------------------------------------------------------------
// generateBracket — seeding
// ---------------------------------------------------------------------------

describe("generateBracket seeding", () => {
  it("seeds 1st vs last, 2nd vs second-last", () => {
    const matches = generateBracket([
      rider("Seed1"),
      rider("Seed2"),
      rider("Seed3"),
      rider("Seed4"),
    ])
    const r1 = matches.filter((m) => m.round === 1)
    // Match 0: Seed1 (index 0) vs Seed4 (index 3)
    expect(r1[0].player1?.name).toBe("Seed1")
    expect(r1[0].player2?.name).toBe("Seed4")
    expect(r1[0].player1Seed).toBe(1)
    expect(r1[0].player2Seed).toBe(4)
    // Match 1: Seed2 (index 1) vs Seed3 (index 2)
    expect(r1[1].player1?.name).toBe("Seed2")
    expect(r1[1].player2?.name).toBe("Seed3")
  })

  it("assigns seed numbers (1-indexed)", () => {
    const matches = generateBracket([rider("A"), rider("B")])
    expect(matches[0].player1Seed).toBe(1)
    expect(matches[0].player2Seed).toBe(2)
  })

  it("does not assign seed to BYE entries", () => {
    // 3 participants → padded to 4, one BYE
    const matches = generateBracket([rider("A"), rider("B"), rider("C")])
    const r1 = matches.filter((m) => m.round === 1)
    // Match with BYE should have null seed for the BYE player
    const byeMatch = r1.find((m) => isBye(m.player1) || isBye(m.player2))
    expect(byeMatch).toBeDefined()
    if (isBye(byeMatch?.player1)) {
      expect(byeMatch?.player1Seed).toBeNull()
    } else {
      expect(byeMatch?.player2Seed).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// generateBracket — BYE handling
// ---------------------------------------------------------------------------

describe("generateBracket BYE handling", () => {
  it("pads to next power of 2 with BYEs", () => {
    // 3 participants → 4-slot bracket (1 BYE)
    const matches = generateBracket([rider("A"), rider("B"), rider("C")])
    const r1 = matches.filter((m) => m.round === 1)
    expect(r1).toHaveLength(2)
    const byeMatches = r1.filter((m) => isBye(m.player1) || isBye(m.player2))
    expect(byeMatches).toHaveLength(1)
  })

  it("auto-advances BYE matches (player2 is BYE)", () => {
    // 3 participants: A vs BYE should auto-advance A
    const matches = generateBracket([rider("A"), rider("B"), rider("C")])
    const r1 = matches.filter((m) => m.round === 1)
    const byeMatch = r1.find((m) => isBye(m.player2))
    if (byeMatch) {
      expect(byeMatch.winner).toBe(1) // player1 auto-wins
    }
  })

  it("propagates BYE winners to next round", () => {
    // 3 participants: the BYE-match winner should appear in R2
    const matches = generateBracket([rider("A"), rider("B"), rider("C")])
    const final = matches.find((m) => m.round === 2 && m.id !== "3rd")
    expect(final).toBeDefined()
    // One of the final's players should already be populated from BYE auto-advance
    const hasPlayer = final?.player1 !== null || final?.player2 !== null
    expect(hasPlayer).toBe(true)
  })

  it("handles 5 participants (padded to 8, 3 BYEs)", () => {
    const participants = Array.from({ length: 5 }, (_, i) => rider(`P${i + 1}`))
    const matches = generateBracket(participants)
    const r1 = matches.filter((m) => m.round === 1)
    expect(r1).toHaveLength(4)
    const byeMatches = r1.filter((m) => isBye(m.player1) || isBye(m.player2))
    expect(byeMatches).toHaveLength(3)
    // All BYE matches should be auto-advanced
    for (const m of byeMatches) {
      expect(m.winner).not.toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// generateBracket — 3rd place match
// ---------------------------------------------------------------------------

describe("generateBracket 3rd place match", () => {
  it("includes a 3rd place match for 4+ participants", () => {
    const matches = generateBracket([
      rider("A"),
      rider("B"),
      rider("C"),
      rider("D"),
    ])
    const thirdPlace = matches.find((m) => m.id === "3rd")
    expect(thirdPlace).toBeDefined()
    expect(thirdPlace?.round).toBe(2) // Same round as final
  })

  it("does not include 3rd place for 2 participants", () => {
    const matches = generateBracket([rider("A"), rider("B")])
    expect(matches.find((m) => m.id === "3rd")).toBeUndefined()
  })

  it("populates 3rd place match with semi-final losers when BYE auto-advances", () => {
    // 3 participants: one semi is BYE-auto-advanced, so the loser (BYE) goes to 3rd place
    const matches = generateBracket([rider("A"), rider("B"), rider("C")])
    const thirdPlace = matches.find((m) => m.id === "3rd")
    expect(thirdPlace).toBeDefined()
    // At least one slot should be populated from the auto-advanced BYE loser
    const hasPlayer =
      thirdPlace?.player1 !== null || thirdPlace?.player2 !== null
    expect(hasPlayer).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// applyWinners
// ---------------------------------------------------------------------------

describe("applyWinners", () => {
  const fourPlayers = [rider("A"), rider("B"), rider("C"), rider("D")]

  it("returns unchanged matches for empty winners map", () => {
    const matches = generateBracket(fourPlayers)
    const result = applyWinners(matches, new Map())
    // Should be equal but not same reference
    expect(result).toEqual(matches)
  })

  it("applies a first-round winner and propagates to next round", () => {
    const matches = generateBracket(fourPlayers)
    const sorted = sortedMatches(matches)
    // Find the index of r1-m0
    const r1m0Index = sorted.findIndex((m) => m.id === "r1-m0")
    const winners = new Map<number, 1 | 2>([[r1m0Index, 1]])

    const result = applyWinners(matches, winners)
    const r1m0 = result.find((m) => m.id === "r1-m0")!
    expect(r1m0.winner).toBe(1)

    // Winner should propagate to the final
    const final = result.find((m) => m.round === 2 && m.id !== "3rd")!
    expect(final.player1?.name).toBe("A")
  })

  it("applies winners for both semis and propagates to final + 3rd place", () => {
    const matches = generateBracket(fourPlayers)
    const sorted = sortedMatches(matches)
    const r1m0Idx = sorted.findIndex((m) => m.id === "r1-m0")
    const r1m1Idx = sorted.findIndex((m) => m.id === "r1-m1")

    const winners = new Map<number, 1 | 2>([
      [r1m0Idx, 1], // A beats D
      [r1m1Idx, 2], // C beats B
    ])

    const result = applyWinners(matches, winners)

    const final = result.find((m) => m.round === 2 && m.id !== "3rd")!
    expect(final.player1?.name).toBe("A")
    expect(final.player2?.name).toBe("C")

    const thirdPlace = result.find((m) => m.id === "3rd")!
    expect(thirdPlace.player1?.name).toBe("D") // loser of r1-m0
    expect(thirdPlace.player2?.name).toBe("B") // loser of r1-m1
  })

  it("does not apply winner when players are not yet set", () => {
    const matches = generateBracket(fourPlayers)
    const sorted = sortedMatches(matches)
    // Try to set a winner for the final (R2) before semis are decided
    const finalIdx = sorted.findIndex((m) => m.round === 2 && m.id !== "3rd")
    const winners = new Map<number, 1 | 2>([[finalIdx, 1]])

    const result = applyWinners(matches, winners)
    const final = result.find((m) => m.round === 2 && m.id !== "3rd")!
    // Winner should not be set since players are null
    expect(final.winner).toBeNull()
  })

  it("skips BYE matches (already handled by generateBracket)", () => {
    // 3 players → one BYE match auto-advanced
    const matches = generateBracket([rider("A"), rider("B"), rider("C")])
    const sorted = sortedMatches(matches)
    const byeMatchIdx = sorted.findIndex(
      (m) => m.round === 1 && (isBye(m.player1) || isBye(m.player2)),
    )

    // Try to override BYE match winner
    const winners = new Map<number, 1 | 2>([[byeMatchIdx, 2]])
    const result = applyWinners(matches, winners)

    const byeMatch = result.find((m) => sorted[byeMatchIdx].id === m.id)!
    // Should keep the auto-advanced winner, not the override
    expect(byeMatch.winner).not.toBe(2)
  })

  it("creates new match objects (immutability)", () => {
    const matches = generateBracket(fourPlayers)
    const sorted = sortedMatches(matches)
    const r1m0Idx = sorted.findIndex((m) => m.id === "r1-m0")
    const winners = new Map<number, 1 | 2>([[r1m0Idx, 1]])

    const result = applyWinners(matches, winners)
    // Original should be untouched
    const originalR1m0 = matches.find((m) => m.id === "r1-m0")!
    expect(originalR1m0.winner).toBeNull()
    // Result should have the winner
    const resultR1m0 = result.find((m) => m.id === "r1-m0")!
    expect(resultR1m0.winner).toBe(1)
  })
})
