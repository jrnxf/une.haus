import "@tanstack/react-start/server-only"
import { eq } from "drizzle-orm"

import { db } from "~/db"
import { rius } from "~/db/schema"
import { ROTATION, SEEDED_STATUS } from "~/lib/games/rius/lifecycle"

export type RotateResult = {
  archived: number
  activated: number
  newRoundId: number
}

// The single rotation transition: advance every round one step along the
// lifecycle chain, then seed a fresh upcoming round. Wrapped in a transaction
// so the "exactly one active, one upcoming" invariant never observes a partial
// rotation. The step order in ROTATION guarantees the active round vacates
// before the upcoming round is promoted into its place.
export async function rotate(): Promise<RotateResult> {
  return db.transaction(async (tx) => {
    const counts: Record<string, number> = {}

    for (const { from, to } of ROTATION) {
      const moved = await tx
        .update(rius)
        .set({ status: to })
        .where(eq(rius.status, from))
        .returning()
      counts[from] = moved.length
    }

    const [newRound] = await tx
      .insert(rius)
      .values({ status: SEEDED_STATUS })
      .returning()

    return {
      archived: counts.active ?? 0,
      activated: counts.upcoming ?? 0,
      newRoundId: newRound.id,
    }
  })
}
