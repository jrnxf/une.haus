import { AsyncLocalStorage } from "node:async_hooks"

// Server-only per-request context. The request-logging middleware in
// `src/start.ts` opens a store for every incoming request (SSR documents,
// server routes, and server-function RPCs all flow through it), so any
// `logger.*` call made while handling that request automatically carries the
// same `requestId` (and `userId` once the session is resolved).
//
// NOTE: this module imports `node:async_hooks`, so it must only ever be
// reached from server code. `start.ts` is the single importer. The isomorphic
// logger never imports this file — it reads the store through the globalThis
// seam below — which keeps `node:async_hooks` out of the client bundle.

export type RequestContext = {
  requestId: string
  userId?: number
}

const storage = new AsyncLocalStorage<RequestContext>()

declare global {
  // eslint-disable-next-line no-var
  var __unehausRequestContext: (() => RequestContext | undefined) | undefined
}

globalThis.__unehausRequestContext = () => storage.getStore()

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return storage.run(context, fn)
}

export function setRequestUser(userId: number | undefined): void {
  const store = storage.getStore()
  if (store) store.userId = userId
}

export function newRequestId(): string {
  return crypto.randomUUID()
}
