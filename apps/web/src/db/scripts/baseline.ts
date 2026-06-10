import { sql } from "drizzle-orm"
import { readMigrationFiles } from "drizzle-orm/migrator"

import { db } from "~/db"

// Marks ONLY the baseline migration (0000) as already-applied, so the existing
// prod schema is accepted as-is and `drizzle-kit migrate` applies 0001 onward.
// Idempotent: re-running it does nothing once the table has a row.
const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" })
const baseline = migrations[0]
if (!baseline) throw new Error("no migrations found in ./drizzle")

await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`)
await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`)

const [row] = await db.execute<{ n: number }>(
  sql`SELECT count(*)::int AS n FROM "drizzle"."__drizzle_migrations"`,
)
const already = row?.n ?? 0

if (already > 0) {
  console.log("baseline: migrations table already populated — nothing to do")
} else {
  await db.execute(
    sql`INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
        VALUES (${baseline.hash}, ${baseline.folderMillis})`,
  )
  console.log(`baseline: marked ${baseline.hash.slice(0, 12)}… as applied`)
}
process.exit(0)
