import { sql } from "drizzle-orm"
/**
 * Cutover verification: compare per-table row counts of an imported sqlite
 * database against the counts recorded by pg-to-d1.ts.
 *
 *   bun run src/scripts/verify-d1-import.ts <db.sqlite> <export.counts.json>
 *
 * Exits non-zero on any mismatch. Tables that exist only in the new schema
 * (presence, rate_limits, drizzle journal) are ignored.
 */
import { drizzle } from "drizzle-orm/libsql"

const [dbPath, countsPath] = process.argv.slice(2)
if (!dbPath || !countsPath) {
  console.error(
    "usage: bun run src/scripts/verify-d1-import.ts <db.sqlite> <export.counts.json>",
  )
  process.exit(1)
}

const expected = (await Bun.file(countsPath).json()) as Record<string, number>
const db = drizzle(`file:${dbPath}`)

let mismatches = 0
for (const [table, expectedCount] of Object.entries(expected)) {
  const rows = (await db.all(
    sql.raw(`SELECT COUNT(*) AS count FROM "${table}"`),
  )) as { count: number }[]
  const actual = rows[0]?.count ?? -1
  const ok = actual === expectedCount
  if (!ok) mismatches++
  console.log(
    `${ok ? "ok " : "MISMATCH"} ${table}: pg=${expectedCount} sqlite=${actual}`,
  )
}

if (mismatches > 0) {
  console.error(`\n${mismatches} table(s) mismatched`)
  process.exit(1)
}
console.log("\nall table counts match")
