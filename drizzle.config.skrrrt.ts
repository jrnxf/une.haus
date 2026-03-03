import { type Config } from "drizzle-kit"

import { env } from "~/lib/env"
import { invariant } from "~/lib/invariant"

invariant(env.SKRRRT_DATABASE_URL, "SKRRRT_DATABASE_URL is not set")

export default {
  dbCredentials: {
    url: env.SKRRRT_DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./src/db/skrrrt",
  schema: "./src/db/skrrrt/schema.skrrrt.ts",
} satisfies Config
