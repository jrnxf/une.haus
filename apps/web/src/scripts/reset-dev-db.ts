import { $ } from "bun"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const url = new URL(databaseUrl)

if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
  console.error(
    `Refusing to run against a non-local host (${url.hostname}). This script` +
      ` drops the entire public schema — point DATABASE_URL at a local database` +
      ` before running.`,
  )
  process.exit(1)
}

console.log(
  `Resetting ${url.hostname}${url.pathname} — dropping public schema and re-pushing.`,
)

const dropSql = "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
await $`psql ${databaseUrl} -v ON_ERROR_STOP=1 -c ${dropSql}`

console.log("Pushing schema…")
await $`bunx drizzle-kit push --config=drizzle.config.ts`

console.log("Done.")
