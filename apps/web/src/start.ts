import * as Sentry from "@sentry/tanstackstart-react"
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react"
import { createMiddleware, createStart } from "@tanstack/react-start"

import { logger } from "~/lib/logger"
import {
  newRequestId,
  runWithRequestContext,
  setRequestUser,
} from "~/lib/request-context"
import { useServerSession } from "~/lib/session/hooks"

// Outermost middleware: open a request-context store (so every logger call
// during the request shares one requestId) and emit a single structured
// access log line per request — method, path, status, duration.
const requestLoggerMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const requestId = request.headers.get("x-request-id") ?? newRequestId()
    const startTime = Date.now()
    const { pathname } = new URL(request.url)

    return runWithRequestContext({ requestId }, async () => {
      try {
        const result = await next()
        logger.info("request", {
          method: request.method,
          path: pathname,
          status: result.response.status,
          duration_ms: Date.now() - startTime,
        })
        return result
      } catch (err) {
        logger.error("request failed", {
          method: request.method,
          path: pathname,
          duration_ms: Date.now() - startTime,
          err,
        })
        throw err
      }
    })
  },
)

// Resolves the session once per request: tags the Sentry scope and stamps the
// userId onto the active request context so subsequent log lines (including
// the access log above) carry it.
const sentryUserMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const session = await useServerSession()
    const user = session.data.user ?? null
    Sentry.setUser(user)
    setRequestUser(user?.id)
  } catch {
    // don't block the request if session read fails
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    requestLoggerMiddleware,
    sentryUserMiddleware,
    sentryGlobalRequestMiddleware,
  ],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
}))
