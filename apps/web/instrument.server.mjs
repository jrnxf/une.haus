import * as Sentry from "@sentry/tanstackstart-react"

// WinterCG convention: runtimes self-identify via navigator.userAgent.
// Fallback covers Node <21 where navigator.userAgent isn't set.
const runtime =
  globalThis.navigator?.userAgent ?? `node@${process.versions.node}`

const isProduction = process.env.VITE_ENVIRONMENT === "production"

// Deploy-agnostic boot breadcrumb. SERVICE_NAME/GIT_COMMIT are injected by the
// systemd unit in the homelab (roles/unehaus); both are absent in local dev.
// Shape mirrors src/lib/logger.ts so Loki's `| json` parser treats it like any
// other app log line.
const boot = {
  timestamp: new Date().toISOString(),
  level: "info",
  msg: "boot",
  service: process.env.SERVICE_NAME ?? "unehaus-web",
  env: process.env.VITE_ENVIRONMENT ?? "development",
  commit: process.env.GIT_COMMIT,
  runtime,
  platform: `${process.platform}/${process.arch}`,
  pid: process.pid,
}

if (isProduction) {
  console.log(JSON.stringify(boot))
} else {
  console.log("[boot]", boot)
}

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
