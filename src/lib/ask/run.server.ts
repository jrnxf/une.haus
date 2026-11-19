import Anthropic from "@anthropic-ai/sdk"

import { answerCards } from "~/lib/ask/cards"
import { askSystemPrompt } from "~/lib/ask/prompt"
import { type AskEvent, type AskInput } from "~/lib/ask/schemas"
import { askTools, stepLabel } from "~/lib/ask/tools"
import { logger } from "~/lib/logger"
import { type ToolDb } from "~/mcp/tools/define"

const MODEL = "claude-opus-5-5"
// Thinking is on by default and counts toward max_tokens.
const MAX_TOKENS = 16_000
// Model turns per question. A normal answer needs 2 to 4.
const MAX_TURNS = 8

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date())

// Answers one question with the read tools. Events go to `send` as they
// happen: steps while tools run, answer text as it streams, then cards.
export async function runAsk({
  apiKey,
  db,
  input,
  send,
  signal,
}: {
  apiKey: string
  db: ToolDb
  input: AskInput
  send: (event: AskEvent) => void
  signal: AbortSignal
}) {
  const client = new Anthropic({ apiKey })
  const tools = askTools(db, (tool, toolInput) =>
    send({
      type: "step",
      tool,
      args: JSON.stringify(toolInput),
      label: stepLabel(tool, toolInput),
    }),
  )

  const runner = client.beta.messages.toolRunner(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: "medium" },
      system: askSystemPrompt(today()),
      tools,
      messages: input.messages,
      max_iterations: MAX_TURNS,
      stream: true,
    },
    { signal },
  )

  // Only the last turn is the answer. Text before a tool call is a preamble.
  let answer = ""
  for await (const turn of runner) {
    send({ type: "turn" })
    answer = ""
    for await (const event of turn) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        answer += event.delta.text
        send({ type: "text", text: event.delta.text })
      }
    }
    const message = await turn.finalMessage()
    if (message.stop_reason === "refusal") {
      send({ type: "error", message: "this question cannot be answered." })
      return
    }
    if (message.stop_reason === "max_tokens") {
      logger.warn("ask hit max_tokens", { usage: message.usage })
      send({ type: "error", message: "the answer got too long. ask again." })
      return
    }
  }

  send({ type: "cards", cards: await answerCards(db, answer) })
}
