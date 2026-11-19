import { createFileRoute } from "@tanstack/react-router"

import { AskCompose } from "~/components/ask/ask-compose"
import { AskAnswer, AskQuestion } from "~/components/ask/ask-exchange"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller"
import { useAskThread } from "~/lib/ask/hooks"
import { seo } from "~/lib/seo"

export const Route = createFileRoute("/_authed/ask")({
  head: () =>
    seo({
      title: "ask",
      description: "ask questions about une.haus",
      path: "/ask",
    }),
  component: RouteComponent,
})

const suggestions = [
  "what's the current riu round?",
  "what are people posting about?",
  "how do i learn a unispin?",
  "show me some street videos",
]

function RouteComponent() {
  const { thread, busy, left, ask, reset } = useAskThread()

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>ask</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        {thread.length > 0 ? (
          <PageHeader.Right>
            <PageHeader.Actions>
              <Button variant="secondary" onClick={reset}>
                New
              </Button>
            </PageHeader.Actions>
          </PageHeader.Right>
        ) : null}
      </PageHeader>
      <MessageScrollerProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          {thread.length === 0 ? (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 p-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold">ask une.haus</h1>
                <p className="text-muted-foreground text-sm">
                  questions about riders, posts, tricks, videos and the riu
                  game.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => void ask(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <MessageScroller className="flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto my-4 w-full max-w-2xl">
                  {thread.map((exchange) => (
                    <div key={exchange.id} className="contents">
                      <MessageScrollerItem
                        messageId={`q${exchange.id}`}
                        scrollAnchor
                      >
                        <div className="px-4">
                          <AskQuestion question={exchange.question} />
                        </div>
                      </MessageScrollerItem>
                      <MessageScrollerItem messageId={`a${exchange.id}`}>
                        <div className="px-4">
                          <AskAnswer exchange={exchange} />
                        </div>
                      </MessageScrollerItem>
                    </div>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          )}
          <div className="mx-auto w-full max-w-2xl p-4 pt-0">
            <AskCompose
              busy={busy}
              followUp={thread.length > 0}
              left={left}
              onAsk={(question) => void ask(question)}
            />
          </div>
        </div>
      </MessageScrollerProvider>
    </>
  )
}
