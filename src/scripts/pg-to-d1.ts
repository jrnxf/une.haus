/**
 * One-shot cutover tool: export every public table from the legacy Postgres
 * database as a D1-ready SQL file.
 *
 *   bun run src/scripts/pg-to-d1.ts <postgres-url> <out.sql>
 *
 * Reads live rows (never a SQL-text dump, so escaping is never guessed),
 * converts Postgres values to their sqlite storage forms:
 *   - timestamptz  -> epoch milliseconds (integer)
 *   - boolean      -> 0 / 1
 *   - json/jsonb   -> JSON text
 * and emits INSERTs in foreign-key-safe order (topological by FK graph;
 * rows ordered by id so self-referencing chains insert parents first).
 * `PRAGMA defer_foreign_keys = ON` leads the file as belt-and-braces — D1
 * runs the file in one transaction, where the deferral actually applies.
 *
 * Prints per-table row counts to stderr; `verify-d1-import.ts` compares them
 * against the imported database.
 */
import { SQL } from "bun"

const [pgUrl, outPath] = process.argv.slice(2)
if (!pgUrl || !outPath) {
  console.error(
    "usage: bun run src/scripts/pg-to-d1.ts <postgres-url> <out.sql>",
  )
  process.exit(1)
}

const sql = new SQL(pgUrl)

// Tables that exist only in the new sqlite schema (start empty) or only in
// the old pg schema (dropped) — never exported.
const SKIP_TABLES = new Set(["__drizzle_migrations"])

type ColumnInfo = { name: string; dataType: string }

const tables = (await sql`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`) as { tablename: string }[]

const tableNames = tables
  .map((t) => t.tablename)
  .filter((name) => !SKIP_TABLES.has(name))

// FK dependency edges (child -> parent), for topological insert order.
const fkRows = (await sql`
  SELECT DISTINCT
    tc.table_name AS child,
    ccu.table_name AS parent
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
`) as { child: string; parent: string }[]

function topoSort(names: string[]): string[] {
  const parents = new Map<string, Set<string>>()
  for (const name of names) parents.set(name, new Set())
  for (const { child, parent } of fkRows) {
    if (child !== parent && parents.has(child) && parents.has(parent)) {
      parents.get(child)?.add(parent)
    }
  }
  const ordered: string[] = []
  const placed = new Set<string>()
  while (ordered.length < names.length) {
    let progressed = false
    for (const name of names) {
      if (placed.has(name)) continue
      const deps = parents.get(name) ?? new Set()
      if ([...deps].every((dep) => placed.has(dep))) {
        ordered.push(name)
        placed.add(name)
        progressed = true
      }
    }
    if (!progressed) {
      // FK cycle across tables — fall back to appending the rest; the defer
      // pragma covers it on import.
      for (const name of names) if (!placed.has(name)) ordered.push(name)
      break
    }
  }
  return ordered
}

function sqliteLiteral(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return "NULL"

  switch (dataType) {
    case "boolean":
      return value ? "1" : "0"
    case "timestamp with time zone":
    case "timestamp without time zone":
      return String((value as Date).getTime())
    case "json":
    case "jsonb": {
      const text = typeof value === "string" ? value : JSON.stringify(value)
      return `'${text.replaceAll("'", "''")}'`
    }
    default:
      break
  }

  switch (typeof value) {
    case "number":
      return Number.isFinite(value) ? String(value) : "NULL"
    case "bigint":
      return String(value)
    case "boolean":
      return value ? "1" : "0"
    case "string":
      return `'${value.replaceAll("'", "''")}'`
    default:
      // Arrays/objects from column types not special-cased above.
      return `'${JSON.stringify(value).replaceAll("'", "''")}'`
  }
}

const out: string[] = ["PRAGMA defer_foreign_keys = ON;"]
const counts: Record<string, number> = {}

for (const table of topoSort(tableNames)) {
  const columns = (await sql`
    SELECT column_name AS name, data_type AS "dataType"
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `) as ColumnInfo[]

  const hasId = columns.some((c) => c.name === "id")
  const rows = (await sql`
    SELECT * FROM ${sql(table)}
    ORDER BY ${hasId ? sql`id ASC` : sql`1`}
  `) as Record<string, unknown>[]

  counts[table] = rows.length
  console.error(`${table}: ${rows.length} rows`)
  if (rows.length === 0) continue

  const columnList = columns.map((c) => `"${c.name}"`).join(", ")
  for (const row of rows) {
    const values = columns
      .map((c) => sqliteLiteral(row[c.name], c.dataType))
      .join(", ")
    out.push(`INSERT INTO "${table}" (${columnList}) VALUES (${values});`)
  }
}

await Bun.write(outPath, out.join("\n") + "\n")
await Bun.write(
  outPath.replace(/\.sql$/, "") + ".counts.json",
  JSON.stringify(counts, null, 2) + "\n",
)
console.error(`\nwrote ${out.length - 1} inserts to ${outPath}`)
await sql.end()
