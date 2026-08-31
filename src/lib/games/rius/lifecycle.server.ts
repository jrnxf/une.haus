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
// lifecycle chain, then seed a fresh upcoming round. Runs as one atomic
// db.batch so the "exactly one active, one upcoming" invariant never observes
// a partial rotation (D1 has no interactive transactions; batch is its atomic
// unit). The step order in ROTATION guarantees the active round vacates
// before the upcoming round is promoted into its place.
export async function rotate(): Promise<RotateResult> {
  const [firstStep, ...restSteps] = ROTATION

  const results = await db.batch([
    db
      .update(rius)
      .set({ status: firstStep.to })
      .where(eq(rius.status, firstStep.from))
      .returning(),
    ...restSteps.map(({ from, to }) =>
      db
        .update(rius)
        .set({ status: to })
        .where(eq(rius.status, from))
        .returning(),
    ),
    db.insert(rius).values({ status: SEEDED_STATUS }).returning(),
  ])

  const counts: Record<string, number> = {}
  ROTATION.forEach(({ from }, i) => {
    counts[from] = (results[i] as unknown[]).length
  })

  const inserted = results.at(-1) as (typeof rius.$inferSelect)[]
  const newRound = inserted[0]

  return {
    archived: counts.active ?? 0,
    activated: counts.upcoming ?? 0,
    newRoundId: newRound.id,
  }
}
