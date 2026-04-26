import { withSentry } from "@sentry/cloudflare"
import handler from "@tanstack/react-start/server-entry"

import { rotateRius } from "~/lib/games/rius/scheduled"
import {
  sendDigests,
  sendGameStartReminders,
} from "~/lib/notifications/scheduled"

type SentryEnv = {
  SENTRY_DSN?: string
  VITE_ENVIRONMENT?: string
}

// Minimal inline shapes to avoid pulling @cloudflare/workers-types globally,
// which collides with DOM Response/Element.append in our React code.
type ScheduledController = {
  cron: string
  scheduledTime: number
}
type ExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void
  passThroughOnException: () => void
}

async function dispatchCron(cron: string) {
  switch (cron) {
    case "0 0 * * 1":
      await rotateRius()
      return
    case "0 * * * *":
      await Promise.allSettled([sendDigests(), sendGameStartReminders()])
      return
    default:
      console.warn(`[cron] no handler for cron expression "${cron}"`)
  }
}

export default withSentry(
  (env: SentryEnv) => {
    const isProduction = env.VITE_ENVIRONMENT === "production"
    return {
      dsn: env.SENTRY_DSN,
      enabled: isProduction,
      sendDefaultPii: true,
      enableLogs: true,
      environment: env.VITE_ENVIRONMENT ?? "development",
      tracesSampleRate: isProduction ? 0.2 : 1.0,
      ignoreErrors: [/not found/i, /access denied/i],
      beforeSend(event) {
        const message = event.exception?.values?.[0]?.value
        if (message === "[object Response]") return null
        return event
      },
    }
  },
  {
    fetch(request: Request) {
      return handler.fetch(request)
    },
    scheduled(
      controller: ScheduledController,
      _env: SentryEnv,
      ctx: ExecutionContext,
    ) {
      ctx.waitUntil(dispatchCron(controller.cron))
    },
  },
)
