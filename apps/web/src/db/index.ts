import "@tanstack/react-start/server-only"
import { neonConfig, Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"

import * as schema from "./schema"
import { env } from "~/lib/env"

// On Workers, native WebSocket is available globally.
// On Node (drizzle-kit, scripts), we need to provide one.
if (typeof WebSocket === "undefined") {
  // dynamic import keeps `ws` out of the worker bundle
  const { default: ws } = await import("ws")
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket
}

// Route simple read queries through HTTPS (no WS handshake), batches via WS.
neonConfig.poolQueryViaFetch = true

const pool = new Pool({ connectionString: env.DATABASE_URL })

export const db = drizzle(pool, {
  logger: {
    logQuery: (query, params) => {
      if (env.LOG_SQL) {
        console.log("(sql)", query, params)
      }
    },
  },
  schema,
})
