import { is } from "drizzle-orm"
import { SQLiteTable, getTableConfig } from "drizzle-orm/sqlite-core"

import * as schema from "~/db/schema"
import { HIDDEN_COLUMNS, isBlockedTable } from "~/mcp/sql-guard"

import type { McpServer } from "@modelcontextprotocol/server"

// One line per table: `name(col type, col type, ...)`. Short, so it costs few
// tokens when a client puts it in the model's context.
function describeSchema() {
  return Object.values(schema)
    .flatMap((value) => (is(value, SQLiteTable) ? [getTableConfig(value)] : []))
    .filter((config) => !isBlockedTable(config.name))
    .map((config) => {
      const columns = config.columns
        .filter((col) => !HIDDEN_COLUMNS.includes(col.name))
        .map((col) => `${col.name} ${col.getSQLType()}`)
      return `${config.name}(${columns.join(", ")})`
    })
    .toSorted()
    .join("\n")
}

export function registerSchemaResource(server: McpServer) {
  server.registerResource(
    "schema",
    "unehaus://schema",
    {
      title: "une.haus database schema",
      description:
        "Every table the MCP server may read, with its columns and SQLite types. Private tables and columns are left out.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, text: describeSchema() }],
    }),
  )
}
