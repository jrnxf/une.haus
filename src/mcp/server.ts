import { McpServer } from "@modelcontextprotocol/server"
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio"
import { z } from "zod"

// A local MCP server for une.haus. A client (Claude Code, the MCP Inspector)
// starts this file as a child process and talks to it over stdin/stdout.
//
//   bun run mcp          # run it (a client normally does this for you)
//   bun run mcp:inspect  # open it in the MCP Inspector
//
// stdout belongs to the protocol: every byte on it must be a JSON-RPC
// message. Log with console.error, which goes to stderr.

const server = new McpServer({ name: "unehaus", version: "0.1.0" })

server.registerTool(
  "ping",
  {
    title: "Ping",
    description:
      "Check that the une.haus MCP server is running. Returns the message you send.",
    inputSchema: z.object({
      message: z.string().default("pong").describe("text to send back"),
    }),
    outputSchema: z.object({ message: z.string(), at: z.string() }),
    annotations: { readOnlyHint: true },
  },
  async ({ message }) => {
    const output = { message, at: new Date().toISOString() }
    return {
      // content is what older clients and the model read as text.
      // structuredContent is the same data, typed by outputSchema.
      content: [{ type: "text", text: JSON.stringify(output) }],
      structuredContent: output,
    }
  },
)

await server.connect(new StdioServerTransport())
console.error("unehaus mcp server ready on stdio")
