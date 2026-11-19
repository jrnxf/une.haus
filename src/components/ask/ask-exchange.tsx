import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import { AskMarkdown } from "~/components/ask/ask-markdown"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { type AskStep, type Exchange } from "~/lib/ask/hooks"
import { type AskCard } from "~/lib/ask/schemas"

function Working({ steps }: { steps: AskStep[] }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <span className="bg-primary size-2 animate-pulse rounded-full" />
      <span>{steps.at(-1)?.label ?? "thinking"}</span>
    </div>
  )
}

function Steps({ steps }: { steps: AskStep[] }) {
  if (steps.length === 0) return null
  return (
    <Collapsible>
      <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs">
        <ChevronRightIcon className="size-3 transition-transform group-data-[panel-open]:rotate-90" />
        used {steps.length} {steps.length === 1 ? "tool" : "tools"}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="text-muted-foreground flex flex-col gap-1 pt-2 font-mono text-xs">
          {steps.map((step, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- steps never reorder
            <li key={index} className="break-all">
              {step.tool} {step.args}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Card({ card }: { card: AskCard }) {
  return (
    <Link
      to={card.path}
      className="bg-card hover:bg-accent/50 flex items-center gap-3 overflow-hidden rounded-md border"
    >
      {card.poster ? (
        <img
          src={card.poster}
          alt=""
          loading="lazy"
          className="bg-muted aspect-video w-24 shrink-0 object-cover"
        />
      ) : (
        <div className="bg-muted aspect-video w-24 shrink-0" />
      )}
      <div className="flex min-w-0 flex-col gap-1 py-2 pr-2">
        <span className="truncate text-sm font-medium">{card.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {card.subtitle}
        </span>
      </div>
    </Link>
  )
}

// One question and its answer in the /ask thread.
export function AskExchange({ exchange }: { exchange: Exchange }) {
  const { question, steps, answer, cards, status, error } = exchange
  const answering = status === "working" && !answer
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted self-end rounded-lg px-4 py-2 text-sm">
        {question}
      </div>
      {answering ? <Working steps={steps} /> : <Steps steps={steps} />}
      {answer ? <AskMarkdown>{answer}</AskMarkdown> : null}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.path} card={card} />
          ))}
        </div>
      ) : null}
      {status === "error" ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}
    </div>
  )
}
