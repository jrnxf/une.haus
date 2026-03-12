import * as Sentry from "@sentry/tanstackstart-react"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.VITE_ENVIRONMENT === "production",
  sendDefaultPii: true,
  enableLogs: true,
  environment: process.env.VITE_ENVIRONMENT || "development",
  tracesSampleRate: process.env.VITE_ENVIRONMENT === "production" ? 0.2 : 1.0,
})
