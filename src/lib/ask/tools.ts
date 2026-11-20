import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod"
import { ToolError as RunnerToolError } from "@anthropic-ai/sdk/lib/tools/ToolError"

import { logger } from "~/lib/logger"
import { type Tool, type ToolDb, ToolError } from "~/mcp/tools/define"
import { readTools } from "~/mcp/tools/registry"

// Plain words for each tool, shown while it runs. The input comes from the
// model, so only short, known fields go in.
const labels: Record<string, (input: Record<string, unknown>) => string> = {
  get_user: () => "looking at a rider",
  search_users: ({ q }) => `searching riders for "${q}"`,
  search_tricks: ({ q }) => `searching tricks for "${q}"`,
  search_videos: ({ q, sort }) =>
    q
      ? `searching the vault for "${q}"`
      : sort === "likes"
        ? "ranking the vault by likes"
        : "looking at the vault",
  list_posts: ({ q, sort }) =>
    q
      ? `searching posts for "${q}"`
      : sort === "likes"
        ? "ranking posts by likes"
        : "looking at posts",
  get_post: ({ postId }) => `reading post ${postId}`,
  get_riu_round: ({ round }) =>
    typeof round === "number"
      ? `looking at riu round ${round}`
      : `looking at the ${round ?? "active"} riu round`,
  get_riu_set: ({ setId }) => `looking at riu set ${setId}`,
}

export function stepLabel(name: string, input: Record<string, unknown>) {
  return labels[name]?.(input) ?? "looking things up"
}

// The shared read tools as tool-runner tools. onStep fires when a tool
// starts. A ToolError (a wrong id) goes back to the model as an error result
// it can recover from. Any other error is logged, and the model only hears
// that the lookup failed.
export function askTools(
  db: ToolDb,
  onStep: (tool: string, input: Record<string, unknown>) => void,
) {
  return readTools.map((tool) => {
    const { name, description, inputSchema, run } = tool as Tool
    return betaZodTool({
      name,
      description,
      inputSchema,
      eager_input_streaming: true,
      run: async (input) => {
        onStep(name, input)
        try {
          return JSON.stringify(await run(db, input))
        } catch (error) {
          if (error instanceof ToolError) {
            throw new RunnerToolError([{ type: "text", text: error.message }])
          }
          logger.warn("ask tool failed", { tool: name, err: error })
          throw new RunnerToolError([
            { type: "text", text: "the lookup failed. try another way." },
          ])
        }
      },
    })
  })
}
