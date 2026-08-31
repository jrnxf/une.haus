import { type ResolvedRiderEntry } from "~/lib/tourney/bracket"

export type Match = {
  id: string
  round: number
  position: number
  player1: ResolvedRiderEntry | null
  player2: ResolvedRiderEntry | null
  player1Seed: number | null
  player2Seed: number | null
  winner: 1 | 2 | null
}

export const BYE_ENTRY: ResolvedRiderEntry = { userId: null, name: "bye" }

export function isBye(rider: ResolvedRiderEntry | null): boolean {
  return rider?.name === "bye"
}

export function getRiderName(rider: ResolvedRiderEntry | null): string | null {
  return rider?.name ?? null
}

export function getWinnerName(match: Match): string | null {
  if (!match.winner) return null
  const winner = match.winner === 1 ? match.player1 : match.player2
  return getRiderName(winner)
}

export function getTimerDuration(
  round: number,
  totalRounds: number,
  stageTimes: { battle: number; finals: number },
): number {
  if (round === totalRounds) return stageTimes.finals
  return stageTimes.battle
}

export function generateBracket(participants: ResolvedRiderEntry[]): Match[] {
  const n = participants.length
  if (n < 2) return []

  const bracketSize = 2 ** Math.ceil(Math.log2(n))
  const paddedParticipants: ResolvedRiderEntry[] = [...participants]
  while (paddedParticipants.length < bracketSize) {
    paddedParticipants.push(BYE_ENTRY)
  }

  const matches: Match[] = []
  const rounds = Math.log2(bracketSize)

  // Generate first round matches with proper seeding (1st vs last, 2nd vs second-last, etc.)
  for (let i = 0; i < bracketSize / 2; i++) {
    const player1Index = i
    const player2Index = bracketSize - 1 - i
    matches.push({
      id: `r1-m${i}`,
      round: 1,
      position: i,
      player1: paddedParticipants[player1Index],
      player2: paddedParticipants[player2Index],
      player1Seed: isBye(paddedParticipants[player1Index])
        ? null
        : player1Index + 1,
      player2Seed: isBye(paddedParticipants[player2Index])
        ? null
        : player2Index + 1,
      winner: null,
    })
  }

  // Generate subsequent rounds (empty)
  let matchesInRound = bracketSize / 4
  for (let round = 2; round <= rounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `r${round}-m${i}`,
        round,
        position: i,
        player1: null,
        player2: null,
        player1Seed: null,
        player2Seed: null,
        winner: null,
      })
    }
    matchesInRound /= 2
  }

  // Auto-advance BYE matches in first round
  const firstRoundMatches = matches.filter((m) => m.round === 1)
  for (const match of firstRoundMatches) {
    if (isBye(match.player1) && !isBye(match.player2)) {
      match.winner = 2
    } else if (isBye(match.player2) && !isBye(match.player1)) {
      match.winner = 1
    } else if (isBye(match.player1) && isBye(match.player2)) {
      match.winner = 1
    }
  }

  // Propagate BYE winners through the bracket
  const totalRounds = Math.max(...matches.map((m) => m.round))
  for (let round = 1; round < totalRounds; round++) {
    const roundMatches = matches.filter((m) => m.round === round)
    for (const match of roundMatches) {
      if (match.winner) {
        const nextRound = match.round + 1
        const nextPosition = Math.floor(match.position / 2)
        const nextMatch = matches.find(
          (m) => m.round === nextRound && m.position === nextPosition,
        )
        if (nextMatch) {
          const isTopHalf = match.position % 2 === 0
          const winner = match.winner === 1 ? match.player1 : match.player2
          const winnerSeed =
            match.winner === 1 ? match.player1Seed : match.player2Seed
          if (isTopHalf) {
            nextMatch.player1 = winner
            nextMatch.player1Seed = winnerSeed
          } else {
            nextMatch.player2 = winner
            nextMatch.player2Seed = winnerSeed
          }
          // Auto-advance if opponent is BYE
          if (nextMatch.player1 && nextMatch.player2) {
            if (isBye(nextMatch.player1) && !isBye(nextMatch.player2)) {
              nextMatch.winner = 2
            } else if (isBye(nextMatch.player2) && !isBye(nextMatch.player1)) {
              nextMatch.winner = 1
            }
          }
        }
      }
    }
  }

  // Add 3rd place match if there are at least 2 rounds (4+ participants)
  if (totalRounds >= 2) {
    const thirdPlaceMatch: Match = {
      id: "3rd",
      round: totalRounds,
      position: 1,
      player1: null,
      player2: null,
      player1Seed: null,
      player2Seed: null,
      winner: null,
    }

    // Check if semi-final matches already have BYE-auto-advanced winners
    const semiMatches = matches.filter((m) => m.round === totalRounds - 1)
    for (const semi of semiMatches) {
      if (semi.winner) {
        const loser = semi.winner === 1 ? semi.player2 : semi.player1
        const loserSeed =
          semi.winner === 1 ? semi.player2Seed : semi.player1Seed
        if (semi.position === 0) {
          thirdPlaceMatch.player1 = loser
          thirdPlaceMatch.player1Seed = loserSeed
        } else if (semi.position === 1) {
          thirdPlaceMatch.player2 = loser
          thirdPlaceMatch.player2Seed = loserSeed
        }
      }
    }

    // Auto-advance if one loser is a BYE
    if (thirdPlaceMatch.player1 && thirdPlaceMatch.player2) {
      if (isBye(thirdPlaceMatch.player1) && !isBye(thirdPlaceMatch.player2)) {
        thirdPlaceMatch.winner = 2
      } else if (
        isBye(thirdPlaceMatch.player2) &&
        !isBye(thirdPlaceMatch.player1)
      ) {
        thirdPlaceMatch.winner = 1
      }
    }

    matches.push(thirdPlaceMatch)
  }

  return matches
}

/**
 * Apply winners from encoded string to a generated bracket.
 * Winners map is index-based (matches sorted by round, then position).
 */
export function applyWinners(
  matches: Match[],
  winners: Map<number, 1 | 2>,
): Match[] {
  if (winners.size === 0) return matches

  const updated = matches.map((m) => ({ ...m }))

  // Sort to get index mapping (same order as encoding)
  const sortedMatches = [...updated].toSorted((a, b) => {
    if (a.round !== b.round) return a.round - b.round
    return a.position - b.position
  })

  // Build a lookup from match id to sorted index
  const idToIndex = new Map<string, number>()
  for (const [i, m] of sortedMatches.entries()) idToIndex.set(m.id, i)

  // Apply winners in round order (so propagation works correctly)
  const totalRounds = Math.max(...updated.map((m) => m.round))

  for (let round = 1; round <= totalRounds; round++) {
    const roundMatches = updated.filter((m) => m.round === round)
    for (const match of roundMatches) {
      const index = idToIndex.get(match.id)
      if (index === undefined) continue

      const winner = winners.get(index)
      if (!winner) continue

      // Skip if this is a BYE match (already handled by generateBracket)
      if (isBye(match.player1) || isBye(match.player2)) continue

      // Skip if players aren't set yet
      if (!match.player1 || !match.player2) continue

      match.winner = winner

      // Propagate to next round
      if (match.round < totalRounds) {
        const nextRound = match.round + 1
        const nextPosition = Math.floor(match.position / 2)
        const isTopHalf = match.position % 2 === 0
        const winnerRider = winner === 1 ? match.player1 : match.player2
        const winnerSeed = winner === 1 ? match.player1Seed : match.player2Seed

        const nextMatch = updated.find(
          (m) => m.round === nextRound && m.position === nextPosition,
        )

        if (nextMatch && winnerRider) {
          if (isTopHalf) {
            nextMatch.player1 = winnerRider
            nextMatch.player1Seed = winnerSeed
          } else {
            nextMatch.player2 = winnerRider
            nextMatch.player2Seed = winnerSeed
          }
        }

        // Populate 3rd place match with semi-final losers
        if (match.round === totalRounds - 1) {
          const thirdPlaceMatch = updated.find((m) => m.id === "3rd")
          if (thirdPlaceMatch) {
            const loser = winner === 1 ? match.player2 : match.player1
            const loserSeed =
              winner === 1 ? match.player2Seed : match.player1Seed
            if (match.position === 0) {
              thirdPlaceMatch.player1 = loser
              thirdPlaceMatch.player1Seed = loserSeed
            } else if (match.position === 1) {
              thirdPlaceMatch.player2 = loser
              thirdPlaceMatch.player2Seed = loserSeed
            }

            // Auto-advance if one loser is a BYE
            if (thirdPlaceMatch.player1 && thirdPlaceMatch.player2) {
              if (
                isBye(thirdPlaceMatch.player1) &&
                !isBye(thirdPlaceMatch.player2)
              ) {
                thirdPlaceMatch.winner = 2
              } else if (
                isBye(thirdPlaceMatch.player2) &&
                !isBye(thirdPlaceMatch.player1)
              ) {
                thirdPlaceMatch.winner = 1
              }
            }
          }
        }
      }
    }
  }

  return updated
}
