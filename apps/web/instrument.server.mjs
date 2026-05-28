import * as Sentry from "@sentry/tanstackstart-react"

// WinterCG convention: runtimes self-identify via navigator.userAgent.
// Fallback covers Node <21 where navigator.userAgent isn't set.
const runtime =
  globalThis.navigator?.userAgent ?? `node@${process.versions.node}`

console.log("[boot]", {
  runtime,
  platform: `${process.platform}/${process.arch}`,
  env: process.env.VITE_ENVIRONMENT,
  pid: process.pid,
})

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
