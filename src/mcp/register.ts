import { registerRiuRecapPrompt } from "~/mcp/prompts/riu-recap"
import { registerSchemaResource } from "~/mcp/resources/schema"
import { type Tool, type ToolDb, ToolError } from "~/mcp/tools/define"
import { readTools } from "~/mcp/tools/registry"
import { errorResult, jsonResult } from "~/mcp/tools/result"

import type { McpServer } from "@modelcontextprotocol/server"

// Wraps one transport-free tool as an MCP tool. A ToolError becomes an
// isError result the model can read. Any other error is a real bug, so it
// goes up to the SDK.
function registerTool(server: McpServer, db: ToolDb, tool: Tool) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (input) => {
      try {
        return jsonResult(await tool.run(db, input))
      } catch (error) {
        if (error instanceof ToolError) return errorResult(error.message)
        throw error
      }
    },
  )
}

// Everything both servers share: the read tools, the schema resource and
// the riu_recap prompt.
export function registerShared(server: McpServer, db: ToolDb) {
  for (const tool of readTools) registerTool(server, db, tool as Tool)
  registerSchemaResource(server)
  registerRiuRecapPrompt(server, db)
}
