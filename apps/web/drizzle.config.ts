import { type Config } from "drizzle-kit"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

export default {
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./src/db",
  schema: "./src/db/schema.ts",
} satisfies Config
