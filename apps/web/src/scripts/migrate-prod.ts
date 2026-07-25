import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import process from "node:process"
import postgres from "postgres"

// Production migration runner. CI bundles this into the release artifact with
// `bun build --target=bun` (alongside a copy of the drizzle/ folder), so the
// deploy box can apply committed migration files with bare Bun — no dev
// node_modules, no drizzle-kit. Writes the same journal table as
// `drizzle-kit migrate` (drizzle.__drizzle_migrations), so the two are
// interchangeable and idempotent against each other.
//
// Usage: DATABASE_URL=… bun migrate.mjs <migrations-folder>

const migrationsFolder = process.argv[2]
if (!migrationsFolder) {
  console.error("migrate: usage: bun migrate.mjs <migrations-folder>")
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("migrate: DATABASE_URL is not set")
  process.exit(1)
}

const client = postgres(databaseUrl, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(client), { migrationsFolder })
  console.log("migrate: all migrations applied")
} finally {
  await client.end()
}
