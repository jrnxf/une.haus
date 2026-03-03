import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { env } from "~/lib/env"

const client = postgres(env.DATABASE_URL)

export const db = drizzle(client, {
  logger: {
    logQuery: (query, params) => {
      if (env.LOG_SQL) {
        console.log("(sql)", query, params)
      }
    },
  },
  schema,
})
