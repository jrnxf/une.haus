import "@tanstack/react-start/server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { env } from "~/lib/env"

const client = postgres(env.DATABASE_URL, {
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
  prepare: false,
})

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
