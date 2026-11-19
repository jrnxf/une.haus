import { McpServer, createMcpHandler } from "@modelcontextprotocol/server"

import { db } from "~/db"
import { logger } from "~/lib/logger"
import { registerShared } from "~/mcp/register"

// The une.haus MCP server over HTTP, served by the Worker at /mcp.
//
// Stateless: createMcpHandler builds a fresh McpServer for every request, so
// nothing lives between requests and any Worker instance can answer. The
// tools read `db`, the per-request D1 session that src/server.ts opens.
//
// It serves the shared read tools only. The raw `query` tool stays on the
// local server, because the D1 binding can write.
export const mcpHandler = createMcpHandler(
  () => {
    const server = new McpServer({ name: "unehaus", version: "0.2.0" })
    registerShared(server, db)
    return server
  },
  {
    // No tool sends progress, so a plain JSON body is enough.
    responseMode: "json",
    onerror: (err) => logger.warn("mcp request failed", { err }),
  },
)

export const MCP_PATH = "/mcp"
