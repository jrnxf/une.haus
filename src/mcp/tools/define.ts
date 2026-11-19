import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import type { z } from "zod"

import type * as schema from "~/db/schema"

// The database a tool reads. The local server passes prodDb (D1 over REST),
// and the Worker passes its D1 binding. Both are async drizzle sqlite
// databases with the same schema.
export type ToolDb = BaseSQLiteDatabase<"async", unknown, typeof schema>

// A failure the model should see and recover from, such as a wrong id.
// Adapters turn it into an error result instead of a crash.
export class ToolError extends Error {}

// One tool, free of any transport. An adapter (MCP server, Claude tool
// runner) wraps `run` and sends its output in the shape it needs.
export type Tool<
  I extends z.ZodObject = z.ZodObject,
  O extends z.ZodObject = z.ZodObject,
> = {
  name: string
  title: string
  description: string
  inputSchema: I
  outputSchema: O
  run: (db: ToolDb, input: z.output<I>) => Promise<z.input<O>>
}

// Keeps the generics, so `run` gets typed input and checked output.
export function defineTool<I extends z.ZodObject, O extends z.ZodObject>(
  tool: Tool<I, O>,
) {
  return tool
}
