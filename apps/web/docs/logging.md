# Logging

Structured, queryable logs that flow from the app to Grafana Loki in the
homelab. The goal: every server log line is a JSON object, so Loki's `| json`
parser, labels, and metric queries work without regex gymnastics.

## The pipeline

```
app (Bun)  →  stdout/stderr  →  systemd journal  →  Grafana Alloy  →  Loki  →  Grafana
   |                                                     |
   logger.ts emits JSON                       loki.process parses it:
   one object per line                        level → label, ids → structured metadata
```

In production every server log line is a single JSON object on stdout. systemd
captures it; Alloy (`roles/alloy` in the homelab repo) tails the journal and
ships it to Loki on the o11y LXC.

## Using the logger

Import from `~/lib/logger`. Never use `console.*` in server code.

```ts
import { logger } from "~/lib/logger"

logger.info("digest sent", { task, userId: user.userId, notifications: 3 })
logger.warn("rate limited", { ip })
logger.error("digest send failed", { userId, err }) // Error → { name, message, stack }
logger.debug("polling for mux upload", { uploadId }) // suppressed in production
```

For fire-and-forget promises, use `logRejection` instead of a swallowed
`.catch(console.error)`:

```ts
import { logRejection } from "~/lib/logger"

createNotification({ ... }).catch(logRejection("messages.notify"))
// logs: { level: "error", msg: "messages.notify failed", err: {...}, requestId, ... }
```

### Levels

- `debug` — verbose, local dev only (dropped in production)
- `info` — normal operations (the request access log, task progress)
- `warn` — recoverable oddities
- `error` — failures worth investigating

### Field conventions

- Pass structured fields, never interpolate into the message: `logger.info("user fetched", { userId })`, not ``logger.info(`fetched ${userId}`)``.
- Keep the `msg` stable and low-cardinality so it groups well; put the varying bits in fields.
- An `Error` value in any field is expanded to `{ name, message, stack }`.
- Reserved keys (`timestamp`, `level`, `msg`, `service`, `env`, `commit`, `requestId`, `userId`) are owned by the logger; a field with the same name is prefixed with `field_`.

## Output shape

Production (one line, newline-delimited JSON):

```json
{
  "timestamp": "2026-05-28T19:04:11.882Z",
  "level": "info",
  "msg": "request",
  "service": "unehaus-web",
  "env": "production",
  "commit": "b0ecfc1",
  "method": "GET",
  "path": "/games/rius",
  "status": 200,
  "duration_ms": 42,
  "requestId": "5f3c…",
  "userId": 1
}
```

Development (pretty):

```
[info] (req 5f3c8a1d) request { method: 'GET', path: '/games/rius', status: 200, duration_ms: 42 }
```

`commit` and `service` come from `GIT_COMMIT` / `SERVICE_NAME`, injected by the
systemd unit in the homelab (`roles/unehaus`). They're absent in local dev.

## Request correlation

`src/start.ts` registers a global request middleware that, for every request
(SSR documents, server routes, and server-function RPCs):

1. opens an `AsyncLocalStorage` context (`src/lib/request-context.ts`) with a `requestId` (honoring an inbound `x-request-id` header, else a fresh UUID),
2. emits one `request` access log line — method, path, status, `duration_ms`,
3. and the session middleware stamps `userId` into that context.

Because the context is ambient, **every** `logger.*` call made while handling a
request automatically carries `requestId` and `userId` — no manual threading.
The logger reads the context through a `globalThis` seam so it never imports
`node:async_hooks`, keeping that Node built-in out of the client bundle.

Client logs do not reach Loki (no journald). In production the client logger
surfaces only errors to the console; client exception tracking is Sentry's job
(`src/router.tsx`).

## How Loki sees it

Alloy's `loki.process "app_json"` stage (homelab `roles/alloy/templates/config.alloy.j2`)
parses the JSON for `unehaus-*` units and:

- promotes the app's `level` to a Loki **label** (4 low-cardinality values). Without this, `level` would always be `info` — journald derives it from the stream priority, and Bun writes everything to stdout.
- attaches `requestId` / `userId` as **structured metadata** — queryable without the cardinality cost of labels.

Base labels on every line: `service="unehaus"`, `unit="unehaus-web.service"`,
`host="unehaus"`.

> Label discipline: only low-cardinality dimensions become labels (`level`,
> `unit`, `service`). High-cardinality identifiers (`requestId`, `userId`,
> `path`) live in structured metadata or the JSON body — making them labels
> would explode Loki's index.

## LogQL cookbook

```logql
# all web app logs
{service="unehaus", unit="unehaus-web.service"}

# errors only (real app severity, now that level is a label)
{service="unehaus"} | level="error"

# request rate by status code
sum by (status) (rate({service="unehaus"} | json | __error__="" [5m]))

# p95 request latency
quantile_over_time(0.95, {service="unehaus"} | json | unwrap duration_ms [5m])

# slowest endpoints over 10m
topk(10, avg by (path) (avg_over_time({service="unehaus"} | json | unwrap duration_ms [10m])))

# everything from one request (structured metadata — no cardinality cost)
{service="unehaus"} | request_id="5f3c8a1d-…"

# all activity for one user
{service="unehaus"} | user_id="1"

# a specific scheduled task
{service="unehaus"} | json | task="notifications:send-digests"

# logs for a specific release
{service="unehaus"} | json | commit="b0ecfc1"
```

## Boot log

`instrument.server.mjs` emits a `boot` line (same JSON shape) on startup with
`runtime`, `platform`, `pid`, `commit`, and `service`. Query the deploy history
with `{service="unehaus"} | json | msg="boot"`.
