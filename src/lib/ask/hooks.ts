import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { ask as askApi } from "~/lib/ask/index"
import { type AskCard, type AskEvent } from "~/lib/ask/schemas"
import { useSessionUser } from "~/lib/session/hooks"

// at is when the step arrived, in Date.now() milliseconds.
export type AskStep = { label: string; tool: string; args: string; at: number }

// One question and its answer.
export type Exchange = {
  id: number
  question: string
  steps: AskStep[]
  answer: string
  cards: AskCard[]
  status: "working" | "done" | "error"
  error?: string
  // A model turn started after a tool ran. The model is thinking again.
  thinking: boolean
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

function apply(exchange: Exchange, event: AskEvent, now: number): Exchange {
  switch (event.type) {
    case "quota":
      return exchange
    case "step":
      return {
        ...exchange,
        thinking: false,
        steps: [
          ...exchange.steps,
          { label: event.label, tool: event.tool, args: event.args, at: now },
        ],
      }
    case "turn":
      return { ...exchange, answer: "", thinking: exchange.steps.length > 0 }
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

// The state of the ask thread. AskThreadProvider holds it above the routes,
// so a question sent from the home page shows on /ask and the thread stays
// when the member opens another page. Nothing is saved: a reload clears it.
// Pages read it with useAskThread.
export function useAskThreadState() {
  const [thread, setThread] = useState<Exchange[]>([])
  const queryClient = useQueryClient()
  const userId = useSessionUser()?.id ?? null
  // A thread belongs to the member who asked. It clears when the session
  // user changes, so a sign-out does not leave it for the next person.
  const [owner, setOwner] = useState(userId)
  if (owner !== userId) {
    setOwner(userId)
    setThread([])
  }
  // The server reports the share of today's budget used as the answer
  // streams. It goes into the usage query, which the meter reads.
  const setUsed = (used: number) =>
    queryClient.setQueryData(
      askApi.usage.queryOptions(userId).queryKey,
      (old) => (old ? { used } : old),
    )
  const controller = useRef<AbortController | null>(null)
  const nextId = useRef(0)

  const busy = thread.at(-1)?.status === "working"

  const update = (id: number, change: (exchange: Exchange) => Exchange) =>
    setThread((current) =>
      current.map((exchange) =>
        exchange.id === id ? change(exchange) : exchange,
      ),
    )

  // Ask a question after the exchanges so far. fresh starts a new thread
  // with the question instead, and stops an answer that still streams.
  async function ask(question: string, { fresh = false } = {}) {
    const text = question.trim()
    if (!text || (busy && !fresh)) return
    if (fresh) controller.current?.abort()
    const earlier = fresh ? [] : thread
    const id = nextId.current++
    const messages = [...history(earlier), { role: "user", content: text }]
    setThread([
      ...earlier,
      {
        id,
        question: text,
        steps: [],
        answer: "",
        cards: [],
        status: "working",
        thinking: false,
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
      if (response.status === 429) setUsed(100)
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
          if (event.type === "quota") setUsed(event.used)
          const now = Date.now()
          update(id, (exchange) => apply(exchange, event, now))
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

  return { thread, busy, ask, reset }
}

// A tool often runs in a few milliseconds, so its label would only flash.
// Each step label shows for at least this long, in order, before the next
// label or "thinking" replaces it.
export const STEP_MIN_MS = 700

// What the working line says at now, and when that changes next (null when
// only a new event can change it).
export function stepTitle(
  steps: AskStep[],
  thinking: boolean,
  clock: number,
): { title: string; next: number | null } {
  const latest = steps.at(-1)
  if (!latest) return { title: "thinking", next: null }
  // The clock can be older than the newest step. Time is at least when
  // that step arrived, so an earlier label never comes back.
  const now = Math.max(clock, latest.at)
  // When each label starts: when its step arrived, or when the label
  // before it has had its minimum time, whichever is later.
  const starts: number[] = []
  for (const step of steps) {
    const previous = starts.at(-1)
    starts.push(
      previous === undefined
        ? step.at
        : Math.max(step.at, previous + STEP_MIN_MS),
    )
  }
  const index = Math.max(
    starts.findLastIndex((start) => start <= now),
    0,
  )
  const label = steps[index]?.label ?? "thinking"
  const nextStart = starts[index + 1]
  if (nextStart !== undefined) return { title: label, next: nextStart }
  if (!thinking) return { title: label, next: null }
  const end = (starts[index] ?? now) + STEP_MIN_MS
  return now < end
    ? { title: label, next: end }
    : { title: "thinking", next: null }
}

// stepTitle for the working line, kept current by a timer. The clock is
// outside React, so it needs an effect.
export function useStepTitle(steps: AskStep[], thinking: boolean) {
  const [now, setNow] = useState(() => Date.now())
  const { title, next } = stepTitle(steps, thinking, now)
  useEffect(() => {
    if (next === null) return
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(next - Date.now(), 0),
    )
    return () => clearTimeout(timer)
  }, [next])
  return title
}

// The API holds back a reply that follows a tool result, then sends it in
// one burst. So the page shows the text at a steady rate instead: at least
// MIN_RATE, and fast enough to show all of it CATCH_UP_MS after the last
// chunk arrived. It shows whole words only. Reduced motion shows it at once.
const MIN_RATE = 0.4 // characters per millisecond
const CATCH_UP_MS = 600

export function usePacedText(text: string) {
  // Text that is already there on mount (an earlier exchange) shows at once.
  const [shown, setShown] = useState(text.length)
  const position = useRef(text.length)
  const previous = useRef(text)

  // An animation frame loop is a clock outside React, so it needs an effect.
  useEffect(() => {
    // A new model turn replaces the text instead of adding to it.
    if (!text.startsWith(previous.current)) position.current = 0
    previous.current = text
    if (
      position.current >= text.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      position.current = text.length
      setShown(text.length)
      return
    }
    const deadline = performance.now() + CATCH_UP_MS
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const backlog = text.length - position.current
      const rate = Math.max(MIN_RATE, backlog / Math.max(deadline - now, 16))
      position.current = Math.min(
        text.length,
        position.current + rate * (now - last),
      )
      last = now
      setShown(wordEnd(text, position.current))
      if (position.current < text.length) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text])

  const visible = text.slice(0, Math.min(shown, text.length))
  return { text: visible, pacing: visible.length < text.length }
}

// The end of the last whole word at or before position.
function wordEnd(text: string, position: number) {
  if (position >= text.length) return text.length
  const end = text.slice(0, Math.floor(position)).search(/\s\S*$/)
  return Math.max(end, 0)
}
