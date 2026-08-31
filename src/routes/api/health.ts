import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          versions: {
            bun: process.versions.bun,
            node: process.versions.node,
          },
        })
      },
    },
  },
})
