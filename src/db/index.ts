import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "~/lib/env";

import * as schema from "./schema";

const client = neon(env.DATABASE_URL);

export const db = drizzle(client, {
  logger: {
    logQuery: (query, params) => {
      if (env.LOG_SQL) {
        console.log("(sql)", query, params);
      }
    },
  },
  schema,
});
