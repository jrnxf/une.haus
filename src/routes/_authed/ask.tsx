import { createFileRoute } from "@tanstack/react-router"

import { AskCompose } from "~/components/ask/ask-compose"
import { AskExchange } from "~/components/ask/ask-exchange"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
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
  "show me flatland videos from this year",
  "how do i learn a backspin?",
  "who rides in finland?",
]

function RouteComponent() {
  const { thread, busy, ask, reset } = useAskThread()

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
      <div className="mx-auto flex w-full max-w-2xl grow flex-col px-4">
        {thread.length === 0 ? (
          <div className="flex grow flex-col justify-center gap-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold">ask une.haus</h1>
              <p className="text-muted-foreground text-sm">
                questions about riders, posts, tricks, videos and the riu game.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="justify-start"
                  onClick={() => void ask(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex grow flex-col gap-6 py-6">
            {thread.map((exchange) => (
              <AskExchange key={exchange.id} exchange={exchange} />
            ))}
          </div>
        )}
        <AskCompose
          busy={busy}
          followUp={thread.length > 0}
          onAsk={(question) => void ask(question)}
        />
      </div>
    </>
  )
}
