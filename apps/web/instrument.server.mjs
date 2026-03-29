import * as Sentry from "@sentry/tanstackstart-react"

const isProduction = process.env.VITE_ENVIRONMENT === "production"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: isProduction,
  sendDefaultPii: true,
  enableLogs: true,
  environment: process.env.VITE_ENVIRONMENT || "development",
  tracesSampleRate: isProduction ? 0.2 : 1.0,
  ignoreErrors: [/not found/i, /access denied/i],
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value
    if (message === "[object Response]") return null
    return event
  },
})
