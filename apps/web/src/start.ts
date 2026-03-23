import * as Sentry from "@sentry/tanstackstart-react"
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react"
import { createMiddleware, createStart } from "@tanstack/react-start"

import { useServerSession } from "~/lib/session/hooks"

const sentryUserMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const session = await useServerSession()
    Sentry.setUser(session.data.user ?? null)
  } catch {
    // don't block the request if session read fails
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [sentryUserMiddleware, sentryGlobalRequestMiddleware],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
}))
