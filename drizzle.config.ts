import { type Config } from "drizzle-kit"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

// DATABASE_URL is a `file:` sqlite path everywhere drizzle-kit runs (local
// dev, tests, CI schema check). Production D1 never sees drizzle-kit —
// generated migrations are applied with `wrangler d1 migrations apply`.
export default {
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/db/schema.ts",
} satisfies Config
