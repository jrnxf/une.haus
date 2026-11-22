import { z } from "zod"

// One turn of an /ask thread. The browser keeps the thread and sends it back
// with each question, as plain text: earlier answers carry no tool calls.
const turn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
})

// Where a member asked: the /ask page or the box on the home page.
export const ASK_SOURCES = ["ask", "home"] as const
export type AskSource = (typeof ASK_SOURCES)[number]

// Why a question got no full answer, as saved in ask_events.
export const ASK_ERRORS = [
  "limit",
  "refusal",
  "too_long",
  "failed",
  "stopped",
] as const
export type AskError = (typeof ASK_ERRORS)[number]

export const askSchema = z.object({
  source: z.enum(ASK_SOURCES).default("ask"),
  // The thread so far, ending with the new question.
  messages: z
    .array(turn)
    .min(1)
    .max(20)
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "the last message must be a question",
    }),
})

export type AskInput = z.infer<typeof askSchema>

// Something an answer links to. Posts, riu sets and videos also show as
// cards under the answer. Every kind gets a hover preview on its link.
export type AskCard = {
  path: string
  kind: "post" | "riu set" | "video" | "rider" | "trick"
  title: string
  subtitle: string
  poster: string | null
  // How far to zoom the poster. Vault videos set it to crop letterboxing.
  posterScale: number
  // A short bio or trick description, for the hover preview.
  description: string | null
}

// Cards under an answer. Only these kinds show as cards: riders and tricks
// only get a hover preview on their link.
export const MAX_CARDS = 4
export const CARD_KINDS = new Set<AskCard["kind"]>(["post", "riu set", "video"])

// What the /api/ask stream sends, one JSON object per line.
export type AskEvent =
  // A tool started. The label is plain words ("looking at riu set 2672"),
  // tool and args are the raw call.
  | { type: "step"; label: string; tool: string; args: string }
  // A new model turn started. Text from the turn before was only a preamble.
  | { type: "turn" }
  // The share of today's budget used, as a whole percent. Sent when the
  // question starts and after each model turn, for members with a budget.
  | { type: "quota"; used: number }
  | { type: "text"; text: string }
  | { type: "cards"; cards: AskCard[] }
  | { type: "error"; message: string }
  | { type: "done" }
