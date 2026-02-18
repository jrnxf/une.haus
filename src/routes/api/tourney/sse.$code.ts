import { createFileRoute } from "@tanstack/react-router";

import {
  subscribeAdminHeartbeat,
  subscribeTourneyUpdates,
} from "~/lib/tourney/realtime";

const MAX_CONNECTION_MS = 5 * 60 * 1000; // 5 minutes
const KEEPALIVE_INTERVAL_MS = 15_000;

export const Route = createFileRoute("/api/tourney/sse/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = (params as { code: string }).code.toUpperCase();

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            let closed = false;
            let cleanupHeartbeat = () => {};

            const close = () => {
              if (closed) return;
              closed = true;
              cleanupState();
              cleanupHeartbeat();
              clearInterval(keepaliveTimer);
              clearTimeout(lifetimeTimer);
              try {
                controller.close();
              } catch {
                // already closed
              }
            };

            request.signal.addEventListener("abort", close);

            const send = (data: string) => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch {
                close();
              }
            };

            const cleanupState = subscribeTourneyUpdates(code, (data) => {
              send(JSON.stringify(data));
            });

            cleanupHeartbeat = subscribeAdminHeartbeat(code, () => {
              if (closed) return;
              try {
                controller.enqueue(
                  encoder.encode(`event: heartbeat\ndata: {}\n\n`),
                );
              } catch {
                close();
              }
            });

            const keepaliveTimer = setInterval(() => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(`: ping\n\n`));
              } catch {
                close();
              }
            }, KEEPALIVE_INTERVAL_MS);

            const lifetimeTimer = setTimeout(close, MAX_CONNECTION_MS);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
