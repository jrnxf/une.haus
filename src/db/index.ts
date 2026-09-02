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

// Structural types for the D1 Sessions API — a session implements
// prepare/batch (all drizzle-orm/d1 needs) plus getBookmark. Constraint is
// "first-primary", "first-unconstrained", or a bookmark from a prior session.
type D1Session = { getBookmark: () => string | null }
type D1BindingWithSessions = {
  withSession: (constraint: string) => D1Session
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

// Runs fn with a per-request drizzle instance backed by a D1 session, so
// reads route to the nearest replica (when read replication is enabled)
// while staying sequentially consistent. Pass a bookmark from the caller's
// previous session for cross-request read-your-writes; the returned bookmark
// should be round-tripped back to that caller.
export async function runWithRequestDb<T>(
  fn: () => Promise<T>,
  constraint = "first-unconstrained",
): Promise<{ result: T; bookmark: string | null }> {
  const binding = (await getD1Binding()) as D1BindingWithSessions
  const session = binding.withSession(constraint)
  const requestDb = drizzleD1(session as never, { logger, schema })
  const result = await dbStorage.run(requestDb, fn)
  return { result, bookmark: session.getBookmark() }
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
