import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"

import { db } from "~/db"
import { tournaments } from "~/db/schema"

const MAX_CONNECTION_MS = 5 * 60 * 1000
const KEEPALIVE_INTERVAL_MS = 15_000
const POLL_INTERVAL_MS = 2000

// SSE backed by database polling: mutations persist to the tournaments row
// (updatedAt / adminHeartbeatAt) and this stream relays any change. Workers
// isolates share no process memory, so the old in-memory EventEmitter pubsub
// could never reach subscribers running in other isolates.
export const Route = createFileRoute("/api/tourney/sse/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = (params as { code: string }).code.toUpperCase()

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            let closed = false
            let lastUpdatedAt = 0
            let lastHeartbeatAt = 0

            const close = () => {
              if (closed) return
              closed = true
              clearInterval(pollTimer)
              clearInterval(keepaliveTimer)
              clearTimeout(lifetimeTimer)
              try {
                controller.close()
              } catch {
                // already closed
              }
            }

            request.signal.addEventListener("abort", close)

            const enqueue = (chunk: string) => {
              if (closed) return
              try {
                controller.enqueue(encoder.encode(chunk))
              } catch {
                close()
              }
            }

            const poll = async () => {
              if (closed) return
              const tournament = await db.query.tournaments.findFirst({
                where: eq(tournaments.code, code),
                columns: {
                  phase: true,
                  state: true,
                  updatedAt: true,
                  adminHeartbeatAt: true,
                },
              })
              if (!tournament || closed) return

              const updatedAt = tournament.updatedAt.getTime()
              if (updatedAt > lastUpdatedAt) {
                // First poll only records the baseline — subscribers already
                // loaded the current state through the regular query.
                if (lastUpdatedAt > 0) {
                  enqueue(
                    `data: ${JSON.stringify({
                      phase: tournament.phase,
                      state: tournament.state,
                      updatedAt,
                    })}\n\n`,
                  )
                }
                lastUpdatedAt = updatedAt
              }

              const heartbeatAt = tournament.adminHeartbeatAt?.getTime() ?? 0
              if (heartbeatAt > lastHeartbeatAt) {
                if (lastHeartbeatAt > 0) {
                  enqueue(`event: heartbeat\ndata: {}\n\n`)
                }
                lastHeartbeatAt = heartbeatAt
              }
            }

            const pollTimer = setInterval(() => {
              poll().catch(close)
            }, POLL_INTERVAL_MS)

            const keepaliveTimer = setInterval(() => {
              enqueue(`: ping\n\n`)
            }, KEEPALIVE_INTERVAL_MS)

            const lifetimeTimer = setTimeout(close, MAX_CONNECTION_MS)

            poll().catch(close)
          },
        })

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        })
      },
    },
  },
})
