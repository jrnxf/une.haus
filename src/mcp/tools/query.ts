import { z } from "zod"

import { rawQuery } from "~/mcp/d1"
import { HIDDEN_COLUMNS } from "~/mcp/sql-guard"
import { errorResult, jsonResult } from "~/mcp/tools/result"

import type { McpServer } from "@modelcontextprotocol/server"

// Enough rows to answer most questions, few enough to keep the reply cheap.
const MAX_ROWS = 200

const queryOutput = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.unknown())),
  truncated: z.boolean(),
})

export function registerQueryTool(server: McpServer) {
  server.registerTool(
    "query",
    {
      title: "Read-only SQL",
      description: [
        "Run one read-only SQLite SELECT against the live une.haus D1 database.",
        "Use it only when no other tool fits, for example counts, rankings or joins across games.",
        "Read the unehaus://schema resource first for table and column names.",
        "Timestamps are milliseconds since 1970. JSON columns are text.",
        `At most ${MAX_ROWS} rows come back. Private tables and columns are refused.`,
      ].join(" "),
      inputSchema: z.object({
        sql: z.string().min(1).describe("a single SELECT or WITH statement"),
        params: z
          .array(z.union([z.string(), z.number(), z.null()]))
          .default([])
          .describe("values for ? placeholders, in order"),
      }),
      outputSchema: queryOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ sql, params }) => {
      try {
        const result = await rawQuery(sql, params)
        // `SELECT *` from users would include email, which the guard cannot
        // see in the SQL text. Drop hidden columns from the result instead.
        const keep = result.columns.flatMap((name, i) =>
          HIDDEN_COLUMNS.includes(name.toLowerCase()) ? [] : [i],
        )
        const rows = result.rows.slice(0, MAX_ROWS)
        return jsonResult({
          columns: keep.map((i) => result.columns[i] ?? ""),
          rows: rows.map((row) => keep.map((i) => row[i])),
          truncated: result.rows.length > MAX_ROWS,
        })
      } catch (error) {
        // Bad SQL is the model's mistake to fix, so send the message back.
        return errorResult(
          error instanceof Error ? error.message : String(error),
        )
      }
    },
  )
}
