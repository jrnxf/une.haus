import { z } from "zod"

// One turn of an /ask thread. The browser keeps the thread and sends it back
// with each question, as plain text: earlier answers carry no tool calls.
const turn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
})

export const askSchema = z.object({
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

// A content card under an answer.
export type AskCard = {
  path: string
  kind: "post" | "riu set" | "video"
  title: string
  subtitle: string
  poster: string | null
}

// What the /api/ask stream sends, one JSON object per line.
export type AskEvent =
  // A tool started. The label is plain words ("looking at riu set 2672"),
  // tool and args are the raw call.
  | { type: "step"; label: string; tool: string; args: string }
  // A new model turn started. Text from the turn before was only a preamble.
  | { type: "turn" }
  // Questions left today. Sent only when few are left.
  | { type: "quota"; left: number }
  | { type: "text"; text: string }
  | { type: "cards"; cards: AskCard[] }
  | { type: "error"; message: string }
  | { type: "done" }
