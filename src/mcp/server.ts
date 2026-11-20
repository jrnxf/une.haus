import { McpServer } from "@modelcontextprotocol/server"
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio"

import { prodDb } from "~/mcp/d1"
import { registerShared } from "~/mcp/register"
import { registerQueryTool } from "~/mcp/tools/query"

// A local MCP server for une.haus. A client (Claude Code, the MCP Inspector)
// starts this file as a child process and talks to it over stdin/stdout.
//
//   bun run mcp          # run it (a client normally does this for you)
//   bun run mcp:inspect  # open it in the MCP Inspector
//
// stdout belongs to the protocol: every byte on it must be a JSON-RPC
// message. Log with console.error, which goes to stderr.

const server = new McpServer({ name: "unehaus", version: "0.1.0" })

// The read tools, schema resource and riu_recap prompt, on live data.
registerShared(server, prodDb)
// Raw SQL goes only through the read-only REST path, so only this server
// has it.
registerQueryTool(server)

await server.connect(new StdioServerTransport())
console.error("unehaus mcp server ready on stdio")
