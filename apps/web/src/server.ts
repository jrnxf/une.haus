import { withSentry } from "@sentry/cloudflare"
import handler, { createServerEntry } from "@tanstack/react-start/server-entry"

type SentryEnv = {
  SENTRY_DSN?: string
  VITE_ENVIRONMENT?: string
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
  createServerEntry({
    fetch(request: Request) {
      return handler.fetch(request)
    },
  }),
)
