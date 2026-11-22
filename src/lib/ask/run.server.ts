import Anthropic from "@anthropic-ai/sdk"

import { type AskBudget } from "~/lib/ask/budget.server"
import { answerCards } from "~/lib/ask/cards"
import { costMicrousd, percentUsed, type TurnUsage } from "~/lib/ask/cost"
import { type AskMember, askSystemPrompt } from "~/lib/ask/prompt"
import { type AskError, type AskEvent, type AskInput } from "~/lib/ask/schemas"
import { askTools, stepLabel } from "~/lib/ask/tools"
import { background } from "~/lib/execution-context"
import { recordAsk } from "~/lib/insights/record.server"
import { logger } from "~/lib/logger"
import { type ToolDb } from "~/mcp/tools/define"

const MODEL = "claude-sonnet-5-5"
// Thinking is on by default and counts toward max_tokens.
const MAX_TOKENS = 16_000
// Model turns per question. A normal answer needs 2 to 4.
const MAX_TURNS = 8

export const LIMIT_MESSAGE = "you reached today's limit. ask again tomorrow."

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date())

// Answers one question with the read tools. Events go to `send` as they
// happen: steps while tools run, answer text as it streams, then cards.
// With a budget, each model turn's cost is charged as soon as the turn ends,
// and no new turn starts once the budget is spent.
// When it ends, one ask_events row saves who asked, from where, the tool
// names, the turns, the cost and any error. It never saves question or
// answer text.
export async function runAsk({
  apiKey,
  budget,
  db,
  input,
  member,
  send,
  signal,
}: {
  apiKey: string
  budget: AskBudget | null
  db: ToolDb
  input: AskInput
  member: AskMember
  send: (event: AskEvent) => void
  signal: AbortSignal
}) {
  const client = new Anthropic({ apiKey })
  const toolNames: string[] = []
  const tools = askTools(db, (tool, toolInput) => {
    toolNames.push(tool)
    send({
      type: "step",
      tool,
      args: JSON.stringify(toolInput),
      label: stepLabel(tool, toolInput),
    })
  })

  const runner = client.beta.messages.toolRunner(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: "medium" },
      // The tools and the system prompt are the same for every question, so
      // cache them. Top-level cache_control also caches the thread as it
      // grows, so each tool turn reads the turns before it from the cache.
      system: [
        {
          type: "text",
          text: askSystemPrompt(today(), member),
          cache_control: { type: "ephemeral" },
        },
      ],
      cache_control: { type: "ephemeral" },
      tools,
      messages: input.messages,
      max_iterations: MAX_TURNS,
      stream: true,
    },
    { signal },
  )

  // Only the last turn is the answer. Text before a tool call is a preamble.
  let answer = ""
  // Token totals for the whole question, logged once so cost can be checked.
  const totals = { turns: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }
  let costTotal = 0
  // Set before each early return. A throw is "failed", or "stopped" when
  // the member left.
  let error: AskError | null = null
  let threw = false
  try {
    for await (const turn of runner) {
      send({ type: "turn" })
      answer = ""
      // Usage comes from the stream events, not finalMessage(), so a turn
      // cut short when the member leaves is still charged.
      const usage: TurnUsage = {
        input: 0,
        cacheWrite: 0,
        cacheRead: 0,
        output: 0,
      }
      let spent: Promise<number> | null = null
      try {
        for await (const event of turn) {
          if (event.type === "message_start") {
            const start = event.message.usage
            usage.input = start.input_tokens
            usage.cacheWrite = start.cache_creation_input_tokens ?? 0
            usage.cacheRead = start.cache_read_input_tokens ?? 0
            usage.output = start.output_tokens
          } else if (event.type === "message_delta") {
            // Delta usage is cumulative for the turn.
            usage.input = event.usage.input_tokens ?? usage.input
            usage.cacheWrite =
              event.usage.cache_creation_input_tokens ?? usage.cacheWrite
            usage.cacheRead =
              event.usage.cache_read_input_tokens ?? usage.cacheRead
            usage.output = event.usage.output_tokens
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            answer += event.delta.text
            send({ type: "text", text: event.delta.text })
          }
        }
      } finally {
        totals.turns += 1
        totals.input += usage.input
        totals.cacheWrite += usage.cacheWrite
        totals.cacheRead += usage.cacheRead
        totals.output += usage.output
        const cost = costMicrousd(usage)
        costTotal += cost
        if (budget) {
          spent = budget.charge(cost)
          // On Workers, this keeps the write alive after the member leaves.
          background(spent, "ask spend")
        }
      }
      const message = await turn.finalMessage()
      if (message.stop_reason === "refusal") {
        error = "refusal"
        send({ type: "error", message: "this question cannot be answered." })
        return
      }
      if (message.stop_reason === "max_tokens") {
        logger.warn("ask hit max_tokens", { usage: message.usage })
        error = "too_long"
        send({ type: "error", message: "the answer got too long. ask again." })
        return
      }
      if (spent) {
        const used = percentUsed(await spent)
        send({ type: "quota", used })
        // The answer needs another turn, but the budget is gone.
        if (used >= 100 && message.stop_reason === "tool_use") {
          error = "limit"
          send({ type: "error", message: LIMIT_MESSAGE })
          return
        }
      }
    }
  } catch (caught) {
    threw = true
    throw caught
  } finally {
    logger.info("ask usage", { model: MODEL, ...totals })
    if (threw) error = signal.aborted ? "stopped" : "failed"
    background(
      recordAsk({
        userId: member.id,
        source: input.source,
        tools: toolNames,
        turns: totals.turns,
        costMicrousd: costTotal,
        error,
      }),
      "ask event",
    )
  }

  send({ type: "cards", cards: await answerCards(db, answer) })
}
