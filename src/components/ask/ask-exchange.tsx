import { Link } from "@tanstack/react-router"
import { CircleCheckIcon, LoaderCircleIcon } from "lucide-react"

import { AskMarkdown } from "~/components/ask/ask-markdown"
import { Bubble, BubbleContent } from "~/components/ui/bubble"
import { Button } from "~/components/ui/button"
import { Message, MessageContent } from "~/components/ui/message"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "~/components/ui/trace"
import { type AskStep, type Exchange } from "~/lib/ask/hooks"
import { type AskCard, CARD_KINDS, MAX_CARDS } from "~/lib/ask/schemas"
import { cn } from "~/lib/utils"

// What the model does, as it does it. While it works, the line shimmers with
// the current step. After, it folds to "used N tools", and the fold shows the
// raw tool calls.
function Steps({ steps, working }: { steps: AskStep[]; working: boolean }) {
  if (!working && steps.length === 0) return null
  const title = working
    ? (steps.at(-1)?.label ?? "thinking")
    : `used ${steps.length} ${steps.length === 1 ? "tool" : "tools"}`
  const line = (
    <TraceLine status={working ? "running" : undefined}>
      <TraceIcon>
        {working ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <CircleCheckIcon />
        )}
      </TraceIcon>
      <TraceTitle>{title}</TraceTitle>
    </TraceLine>
  )
  return (
    <Trace>
      {steps.length === 0 ? (
        <div>{line}</div>
      ) : (
        <TraceCollapsible>
          <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            <ul className="flex flex-col gap-1 font-mono text-xs">
              {steps.map((step, index) => (
                // oxlint-disable-next-line react/no-array-index-key -- steps never reorder
                <li key={index} className="break-all">
                  {step.tool} {step.args}
                </li>
              ))}
            </ul>
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
    </Trace>
  )
}

function Card({ card }: { card: AskCard }) {
  return (
    <Link
      to={card.path}
      className="bg-card hover:bg-accent/50 flex items-center gap-3 overflow-hidden rounded-md border"
    >
      {/* Like the posts list: a card with no media gets no media slot. */}
      {card.poster ? (
        <img
          src={card.poster}
          alt=""
          loading="lazy"
          className="bg-muted aspect-video w-24 shrink-0 object-cover"
        />
      ) : null}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1 py-2 pr-2",
          !card.poster && "pl-3",
        )}
      >
        <span className="truncate text-sm font-medium">{card.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {card.subtitle}
        </span>
      </div>
    </Link>
  )
}

// The member's question, on the right.
export function AskQuestion({ question }: { question: string }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="muted">
          <BubbleContent>{question}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

// The answer to one question: steps, text, cards, or an error. onRetry is
// set on the last answer once it ends.
export function AskAnswer({
  exchange,
  onRetry,
}: {
  exchange: Exchange
  onRetry?: () => void
}) {
  const { steps, answer, cards, status, error } = exchange
  const shown = cards
    .filter((card) => CARD_KINDS.has(card.kind))
    .slice(0, MAX_CARDS)
  return (
    <Message>
      <MessageContent>
        <Steps steps={steps} working={status === "working" && !answer} />
        {answer ? <AskMarkdown links={cards}>{answer}</AskMarkdown> : null}
        {shown.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {shown.map((card) => (
              <Card key={card.path} card={card} />
            ))}
          </div>
        ) : null}
        {status === "error" ? (
          <Bubble variant="destructive">
            <BubbleContent>{error}</BubbleContent>
          </Bubble>
        ) : null}
        {onRetry ? (
          <div>
            {/* The negative margin lines the label up with the answer text. */}
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2.5"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </MessageContent>
    </Message>
  )
}
