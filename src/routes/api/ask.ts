import { createFileRoute } from "@tanstack/react-router"

import { db } from "~/db"
import { askBudget } from "~/lib/ask/budget.server"
import { percentUsed } from "~/lib/ask/cost"
import { LIMIT_MESSAGE, runAsk } from "~/lib/ask/run.server"
import { askSchema, type AskEvent } from "~/lib/ask/schemas"
import { env } from "~/lib/env"
import { logger } from "~/lib/logger"
import { getServerSessionUser } from "~/lib/session/hooks"

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
        // Each member may spend DAILY_BUDGET_MICROUSD ($2) a day on model
        // time. The owner has no budget.
        const budget = askBudget(user.id)
        const spent = budget ? await budget.spent() : 0
        if (budget && spent >= budget.limit) {
          return Response.json({ message: LIMIT_MESSAGE }, { status: 429 })
        }

        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start: async (controller) => {
            const send = (event: AskEvent) =>
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            try {
              if (budget) send({ type: "quota", used: percentUsed(spent) })
              await runAsk({
                apiKey,
                budget,
                db,
                input: parsed.data,
                member: { id: user.id, name: user.name },
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
