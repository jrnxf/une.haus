import type { Config } from "drizzle-kit";

import { invariant } from "~/lib/invariant";

import { env } from "~/lib/env";

invariant(env.SKRRRT_DATABASE_URL, "SKRRRT_DATABASE_URL is not set");

export default {
  dbCredentials: {
    url: env.SKRRRT_DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./src/db/skrrrt",
  schema: "./src/db/skrrrt/schema.skrrrt.ts",
} satisfies Config;
