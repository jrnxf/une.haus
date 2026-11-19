import { createFileRoute } from "@tanstack/react-router"

import { db } from "~/db"
import { runAsk } from "~/lib/ask/run.server"
import { askSchema, type AskEvent } from "~/lib/ask/schemas"
import { rateLimit } from "~/lib/auth/rate-limit"
import { env } from "~/lib/env"
import { logger } from "~/lib/logger"
import { getServerSessionUser } from "~/lib/session/hooks"

// Questions per member per day. Each one costs real model time.
const DAILY_LIMIT = 20
const DAY_MS = 24 * 60 * 60 * 1000

// POST a thread, get the answer back as newline-delimited JSON events.
export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getServerSessionUser()
        if (!user) {
          return Response.json({ message: "sign in to ask." }, { status: 401 })
        }
        const apiKey = env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return Response.json(
            { message: "ask is not set up here." },
            { status: 503 },
          )
        }
        const parsed = askSchema.safeParse(
          await request.json().catch(() => null),
        )
        if (!parsed.success) {
          return Response.json({ message: "bad question." }, { status: 400 })
        }
        if (!(await rateLimit(`ask:${user.id}`, DAILY_LIMIT, DAY_MS))) {
          return Response.json(
            { message: "you reached today's limit. ask again tomorrow." },
            { status: 429 },
          )
        }

        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start: async (controller) => {
            const send = (event: AskEvent) =>
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            try {
              await runAsk({
                apiKey,
                db,
                input: parsed.data,
                send,
                signal: request.signal,
              })
              send({ type: "done" })
            } catch (error) {
              if (!request.signal.aborted) {
                logger.error("ask failed", { userId: user.id, err: error })
                send({
                  type: "error",
                  message: "something went wrong. try again.",
                })
              }
            } finally {
              controller.close()
            }
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
          },
        })
      },
    },
  },
})
