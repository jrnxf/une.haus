import { type Config } from "drizzle-kit"

import { env } from "~/lib/env"

export default {
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./src/db",
  schema: "./src/db/schema.ts",
} satisfies Config
