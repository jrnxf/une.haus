import { useRef, useState } from "react"

import { type AskCard, type AskEvent } from "~/lib/ask/schemas"

export type AskStep = { label: string; tool: string; args: string }

// One question and its answer.
export type Exchange = {
  id: number
  question: string
  steps: AskStep[]
  answer: string
  cards: AskCard[]
  status: "working" | "done" | "error"
  error?: string
}

// Earlier exchanges sent back as context. The server allows 20 messages.
const CONTEXT_EXCHANGES = 9

function history(thread: Exchange[]) {
  return thread
    .filter((exchange) => exchange.status === "done" && exchange.answer)
    .slice(-CONTEXT_EXCHANGES)
    .flatMap((exchange) => [
      { role: "user" as const, content: exchange.question },
      { role: "assistant" as const, content: exchange.answer },
    ])
}

function apply(exchange: Exchange, event: AskEvent): Exchange {
  switch (event.type) {
    case "quota":
      return exchange
    case "step":
      return {
        ...exchange,
        steps: [
          ...exchange.steps,
          { label: event.label, tool: event.tool, args: event.args },
        ],
      }
    case "turn":
      return { ...exchange, answer: "" }
    case "text":
      return { ...exchange, answer: exchange.answer + event.text }
    case "cards":
      return { ...exchange, cards: event.cards }
    case "error":
      return { ...exchange, status: "error", error: event.message }
    case "done":
      return exchange.status === "working"
        ? { ...exchange, status: "done" }
        : exchange
  }
}

// The /ask thread. It lives in the page only: nothing is saved.
export function useAskThread() {
  const [thread, setThread] = useState<Exchange[]>([])
  // Questions left today, known only once few are left.
  const [left, setLeft] = useState<number | null>(null)
  const controller = useRef<AbortController | null>(null)
  const nextId = useRef(0)

  const busy = thread.at(-1)?.status === "working"

  const update = (id: number, change: (exchange: Exchange) => Exchange) =>
    setThread((current) =>
      current.map((exchange) =>
        exchange.id === id ? change(exchange) : exchange,
      ),
    )

  async function ask(question: string) {
    const text = question.trim()
    if (!text || busy) return
    const id = nextId.current++
    const messages = [...history(thread), { role: "user", content: text }]
    setThread((current) => [
      ...current,
      {
        id,
        question: text,
        steps: [],
        answer: "",
        cards: [],
        status: "working",
      },
    ])

    const abort = new AbortController()
    controller.current = abort
    const fail = (message: string) =>
      update(id, (exchange) => ({
        ...exchange,
        status: "error",
        error: message,
      }))

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: abort.signal,
      })
      if (response.status === 429) setLeft(0)
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        fail(body?.message ?? "something went wrong. try again.")
        return
      }
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader()
      let buffer = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line) continue
          const event = JSON.parse(line) as AskEvent
          if (event.type === "quota") setLeft(event.left)
          update(id, (exchange) => apply(exchange, event))
        }
      }
      // A stream cut off before "done" still counts as an error.
      update(id, (exchange) =>
        exchange.status === "working"
          ? {
              ...exchange,
              status: "error",
              error: "the answer stopped. try again.",
            }
          : exchange,
      )
    } catch {
      if (!abort.signal.aborted) fail("something went wrong. try again.")
    }
  }

  function reset() {
    controller.current?.abort()
    setThread([])
  }

  return { thread, busy, left, ask, reset }
}
