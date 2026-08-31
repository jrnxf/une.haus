import * as Sentry from "@sentry/cloudflare"
import handler from "@tanstack/react-start/server-entry"

import { runWithRequestDb } from "~/db"
import { runWithExecutionContext } from "~/lib/execution-context"
import { ROTATION_CRON } from "~/lib/games/rius/lifecycle"
import { rotate } from "~/lib/games/rius/lifecycle.server"
import { logger } from "~/lib/logger"
import { sendGameStartReminders } from "~/lib/tasks/game-start-reminders.server"
import { sendDigests } from "~/lib/tasks/send-digests.server"

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
      return runWithExecutionContext(ctx, () =>
        runWithRequestDb(async () => handler.fetch(request)),
      )
    },
    scheduled(
      controller: ScheduledController,
      _env: unknown,
      ctx: WorkerExecutionContext,
    ): void {
      ctx.waitUntil(
        runWithExecutionContext(ctx, () =>
          runWithRequestDb(() =>
            runScheduled(controller.cron).catch((err) => {
              logger.error("scheduled run failed", {
                cron: controller.cron,
                err,
              })
              throw err
            }),
          ),
        ),
      )
    },
  },
)
