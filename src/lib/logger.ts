import { createIsomorphicFn } from "@tanstack/react-start"

// Standardized structured logger.
//
// - On the server in production: one JSON object per line on stdout. systemd's
//   journal captures it and Grafana Alloy ships it to Loki, where `| json`
//   parses every field. The `level` field becomes a Loki label and
//   `requestId`/`userId` become structured metadata (see the Alloy config in
//   the homelab repo: roles/alloy/templates/config.alloy.j2).
// - On the server in development: pretty, human-readable console output.
// - On the client: dev console output; in production client logs do not reach
//   Loki (no journald), so only errors are surfaced — exceptions go to Sentry.
//
// Usage: logger.info("message", { someField: 1, err })
// Error values in fields are expanded to { name, message, stack }.

export type LogLevel = "debug" | "info" | "warn" | "error"
export type LogFields = Record<string, unknown>

// Top-level keys the logger owns. A caller-supplied field with one of these
// names is prefixed with `field_` so it can never shadow the real value.
const RESERVED = new Set([
  "timestamp",
  "level",
  "msg",
  "service",
  "env",
  "commit",
  "requestId",
  "userId",
])

const SERVICE = "unehaus-web"

function normalizeFields(fields?: LogFields): LogFields {
  if (!fields) return {}
  const out: LogFields = {}
  for (const [key, value] of Object.entries(fields)) {
    const k = RESERVED.has(key) ? `field_${key}` : key
    out[k] =
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value
  }
  return out
}

const emit = createIsomorphicFn()
  .server((level: LogLevel, msg: string, fields?: LogFields) => {
    const env = process.env.VITE_ENVIRONMENT ?? "development"
    const isProduction = env === "production"

    // Debug is noise in production; keep it for local development only.
    if (isProduction && level === "debug") return

    const context = globalThis.__unehausRequestContext?.()
    const normalized = normalizeFields(fields)

    if (isProduction) {
      const line: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        msg,
        service: process.env.SERVICE_NAME ?? SERVICE,
        env,
        ...normalized,
      }
      const commit = process.env.GIT_COMMIT
      if (commit) line.commit = commit
      if (context?.requestId) line.requestId = context.requestId
      if (context?.userId != null) line.userId = context.userId
      console.log(JSON.stringify(line))
      return
    }

    const reqTag = context?.requestId
      ? ` (req ${context.requestId.slice(0, 8)})`
      : ""
    const consoleMethod = level === "debug" ? "log" : level
    const hasFields = Object.keys(normalized).length > 0
    console[consoleMethod](
      `[${level}]${reqTag} ${msg}`,
      hasFields ? normalized : "",
    )
  })
  .client((level: LogLevel, msg: string, fields?: LogFields) => {
    const env = import.meta.env.VITE_ENVIRONMENT ?? "development"
    const normalized = normalizeFields(fields)

    if (env === "production") {
      // Client logs never reach Loki. Surface errors to the console; rely on
      // Sentry (configured in src/router.tsx) for client exception tracking.
      if (level === "error") console.error(msg, normalized)
      return
    }

    const consoleMethod = level === "debug" ? "log" : level
    console[consoleMethod](`[client] [${level}] ${msg}`, normalized)
  })

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
}

// Handler for fire-and-forget promise rejections, e.g.
//   doThing().catch(logRejection("messages.notify"))
export function logRejection(operation: string, fields?: LogFields) {
  return (err: unknown) =>
    logger.error(`${operation} failed`, { ...fields, err })
}
