import "@tanstack/react-start/server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import { AsyncLocalStorage } from "node:async_hooks"
import postgres from "postgres"

import * as schema from "./schema"
import { env } from "~/lib/env"

// TRANSITIONAL (Workers migration, phase 1): Workers forbid sharing I/O
// objects across requests, so a module-scope postgres.js pool breaks under
// workerd ("Cannot perform I/O on behalf of a different request"). The entry
// in `src/server.ts` opens a per-request client via `runWithRequestDb`; the
// module-scope fallback keeps scripts and tests on a plain singleton. This
// whole file is replaced by the D1 driver in phase 2.

function createDb() {
  const client = postgres(env.DATABASE_URL, {
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    prepare: false,
  })

  return drizzle(client, {
    logger: {
      logQuery: (query, params) => {
        if (env.LOG_SQL) {
          console.log("(sql)", query, params)
        }
      },
    },
    schema,
  })
}

type Db = ReturnType<typeof createDb>

const dbStorage = new AsyncLocalStorage<Db>()
let fallbackDb: Db | undefined

export function runWithRequestDb<T>(fn: () => T): T {
  return dbStorage.run(createDb(), fn)
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const target = dbStorage.getStore() ?? (fallbackDb ??= createDb())
    const value = Reflect.get(target, prop) as unknown
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value
  },
})
