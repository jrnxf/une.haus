import { AsyncLocalStorage } from "node:async_hooks"

import { logRejection } from "~/lib/logger"

// Server-only seam around the Workers ExecutionContext. The entry in
// `src/server.ts` opens a store per request/cron invocation so that
// fire-and-forget work started anywhere in lib code can be registered with
// `ctx.waitUntil` — on Workers, unawaited promises are killed once the
// response returns, so every background task must flow through here.
type WaitUntilContext = {
  waitUntil: (promise: Promise<unknown>) => void
}

const storage = new AsyncLocalStorage<WaitUntilContext>()

export function runWithExecutionContext<T>(
  context: WaitUntilContext,
  fn: () => T,
): T {
  return storage.run(context, fn)
}

/**
 * Run `promise` in the background: kept alive past the response via
 * `ctx.waitUntil` when an execution context is active (Workers), plain
 * fire-and-forget otherwise (tests, scripts). Rejections are logged under
 * `tag`, never thrown.
 */
export function background(promise: Promise<unknown>, tag: string): void {
  const guarded = promise.catch(logRejection(tag))
  storage.getStore()?.waitUntil(guarded)
}
