import "@tanstack/react-start/server-only"
import { type DrizzleD1Database, drizzle as drizzleD1 } from "drizzle-orm/d1"
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql"
import { AsyncLocalStorage } from "node:async_hooks"

import * as schema from "./schema"
import { env } from "~/lib/env"

// Two drivers, one type:
// - Workers (prod, wrangler dev/preview): the D1 binding, one drizzle
//   instance per request/cron invocation opened by src/server.ts via
//   `runWithRequestDb` (Workers forbid sharing I/O objects across requests).
// - bun (tests, scripts): libsql against the `file:` path in DATABASE_URL —
//   async and `batch()`-capable, the closest local match to D1 semantics.
//   The module-scope fallback below serves this path.
export type Db = DrizzleD1Database<typeof schema>

const logger = {
  logQuery: (query: string, params: unknown[]) => {
    if (env.LOG_SQL) {
      console.log("(sql)", query, params)
    }
  },
}

// The D1 binding, present only under workerd. `nodejs_compat` populates
// process.env from vars/secrets but bindings live on the env object — the
// cloudflare:workers module exposes it statelessly.
async function getD1Binding(): Promise<unknown> {
  const { env: workerEnv } = await import("cloudflare:workers")
  return (workerEnv as Record<string, unknown>).DB
}

function createLibsqlDb(): Db {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL (a file: sqlite path) is required outside Workers",
    )
  }
  return drizzleLibsql(env.DATABASE_URL, {
    logger,
    schema,
  }) as unknown as Db
}

const dbStorage = new AsyncLocalStorage<Db>()
let fallbackDb: Db | undefined

export async function runWithRequestDb<T>(fn: () => Promise<T>): Promise<T> {
  const binding = await getD1Binding()
  const requestDb = drizzleD1(binding as never, { logger, schema })
  return dbStorage.run(requestDb, fn)
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const target = dbStorage.getStore() ?? (fallbackDb ??= createLibsqlDb())
    const value = Reflect.get(target, prop) as unknown
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value
  },
})
