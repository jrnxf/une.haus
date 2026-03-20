/**
 * One-time backfill script to populate riuPodium for all existing archived rounds.
 *
 * Usage: bun apps/web/src/db/scripts/backfill-podium.ts
 */

import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { calculateRiderRankings } from "../../lib/games/rius/ranking"
import * as schema from "../schema"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const client = postgres(databaseUrl)
const db = drizzle(client, { schema })

async function main() {
  const archivedRounds = await db.query.rius.findMany({
    where: eq(schema.rius.status, "archived"),
    columns: { id: true },
    with: {
      sets: {
        columns: { id: true, createdAt: true },
        with: {
          user: { columns: { id: true, name: true, avatarId: true } },
          submissions: {
            columns: { id: true, createdAt: true },
            with: {
              user: { columns: { id: true, name: true, avatarId: true } },
            },
          },
        },
      },
    },
  })

  console.log(`Found ${archivedRounds.length} archived rounds`)

  let inserted = 0

  for (const round of archivedRounds) {
    if (round.sets.length === 0) continue

    const rankings = calculateRiderRankings(round.sets)
    const top3 = rankings.slice(0, 3)

    if (top3.length === 0) continue

    await db
      .insert(schema.riuPodium)
      .values(
        top3.map((r) => ({
          riuId: round.id,
          userId: r.user.id,
          rank: r.rank,
        })),
      )
      .onConflictDoNothing()

    inserted += top3.length
    console.log(`Round ${round.id}: inserted ${top3.length} podium entries`)
  }

  console.log(`Done. Inserted ${inserted} total podium entries.`)
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
