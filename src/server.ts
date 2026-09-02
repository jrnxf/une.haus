import geistMonoLatin from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url"
import geistLatin from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"
import * as Sentry from "@sentry/cloudflare"
import handler from "@tanstack/react-start/server-entry"

import { runWithRequestDb } from "~/db"
import { runWithExecutionContext } from "~/lib/execution-context"
import { ROTATION_CRON } from "~/lib/games/rius/lifecycle"
import { rotate } from "~/lib/games/rius/lifecycle.server"
import { logger } from "~/lib/logger"
import { sendGameStartReminders } from "~/lib/tasks/game-start-reminders.server"
import { sendDigests } from "~/lib/tasks/send-digests.server"
import appCss from "~/styles.css?url"

// Structural types for the Workers runtime — avoids pulling the full
// @cloudflare/workers-types ambient globals into the app's type space.
type WorkerExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void
}

type ScheduledController = {
  cron: string
  scheduledTime: number
}

// Hourly cron: digests check each user's configured hour/day, game-start
// reminders check hours-until-rotation with a 1h window. Keep in sync with
// triggers.crons in wrangler.jsonc.
const HOURLY_CRON = "0 * * * *"

async function runScheduled(cron: string) {
  switch (cron) {
    case ROTATION_CRON: {
      const { archived, activated, newRoundId } = await rotate()
      logger.info("rius rotation complete", {
        cron,
        archived,
        activated,
        newRiuId: newRoundId,
      })
      break
    }
    case HOURLY_CRON: {
      const digests = await sendDigests()
      const reminders = await sendGameStartReminders()
      logger.info("hourly notifications complete", {
        cron,
        digests,
        reminders,
      })
      break
    }
    default:
      logger.error("unknown cron", { cron })
  }
}

const isProduction = process.env.VITE_ENVIRONMENT === "production"

// Link headers on HTML responses feed Cloudflare Early Hints: the edge caches
// them and replays a 103 with these preloads before the worker even responds.
// Keep in sync with the preload links in src/routes/__root.tsx. Requires the
// Early Hints toggle on the zone (Speed → Optimization).
const EARLY_HINTS_LINK = [
  `<${appCss}>; rel=preload; as=style`,
  `<${geistLatin}>; rel=preload; as=font; type="font/woff2"; crossorigin`,
  `<${geistMonoLatin}>; rel=preload; as=font; type="font/woff2"; crossorigin`,
].join(", ")

function withEarlyHints(response: Response): Response {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("text/html")) return response
  const withLink = new Response(response.body, response)
  withLink.headers.append("Link", EARLY_HINTS_LINK)
  return withLink
}

// D1 Sessions API bookmark round-trip: the cookie carries the database
// version this browser last saw, so the next request's session never reads
// a replica older than that (read-your-writes across requests).
const D1_BOOKMARK_COOKIE = "d1-bookmark"

function readBookmark(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? ""
  const match = cookie.match(/(?:^|;\s*)d1-bookmark=([^;]+)/)
  return match?.[1]
}

function withBookmark(response: Response, bookmark: string | null): Response {
  if (!bookmark) return response
  const withCookie = new Response(response.body, response)
  withCookie.headers.append(
    "Set-Cookie",
    `${D1_BOOKMARK_COOKIE}=${bookmark}; Path=/; Max-Age=3600; SameSite=Lax; Secure; HttpOnly`,
  )
  return withCookie
}

export default Sentry.withSentry(
  () => ({
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
  }),
  {
    fetch(
      request: Request,
      _env: unknown,
      ctx: WorkerExecutionContext,
    ): Promise<Response> {
      return runWithExecutionContext(ctx, async () => {
        const { result, bookmark } = await runWithRequestDb(
          async () => withEarlyHints(await handler.fetch(request)),
          readBookmark(request) ?? "first-unconstrained",
        )
        return withBookmark(result, bookmark)
      })
    },
    scheduled(
      controller: ScheduledController,
      _env: unknown,
      ctx: WorkerExecutionContext,
    ): void {
      ctx.waitUntil(
        runWithExecutionContext(ctx, () =>
          // Crons have no user session to stay consistent with — always
          // read the primary for the freshest data.
          runWithRequestDb(
            () =>
              runScheduled(controller.cron).catch((err) => {
                logger.error("scheduled run failed", {
                  cron: controller.cron,
                  err,
                })
                throw err
              }),
            "first-primary",
          ),
        ),
      )
    },
  },
)
