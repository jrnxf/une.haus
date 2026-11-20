import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Fragment } from "react"
import { z } from "zod"

import { AskCompose } from "~/components/ask/ask-compose"
import { AskAnswer, AskQuestion } from "~/components/ask/ask-exchange"
import { LogoRandomScatter } from "~/components/logo-animated"
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
import { ask } from "~/lib/ask/index"
import { useAskThread } from "~/lib/ask/thread-context"
import { seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"

// q holds a question a guest typed before sign-in, so it waits in the box.
const askSearchSchema = z.object({
  q: z.string().max(2000).optional(),
})

export const Route = createFileRoute("/ask")({
  validateSearch: askSearchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      ask.usage.queryOptions(context.session.user?.id ?? null),
    )
  },
  head: () =>
    seo({
      title: "ask",
      description:
        "ask anything about une.haus: tricks, riders, games, posts and videos.",
      path: "/ask",
    }),
  component: RouteComponent,
})

// Phones show only the first MOBILE_SUGGESTIONS, so the best ones go first.
const suggestions = [
  "what's the current rack-it-up round?",
  "what tricks need to be backed up?",
  "what is a unispin?",
  "show me some street videos",
  "who won the last rack-it-up round?",
  "what are people posting about?",
  "what is a treytriple?",
  "show me a classic flatland video",
]
const MOBILE_SUGGESTIONS = 4

function RouteComponent() {
  const sessionUser = useSessionUser()
  const { q } = Route.useSearch()
  const navigate = useNavigate()
  const { thread, busy, ask: askQuestion, reset } = useAskThread()
  const { data: usage } = useSuspenseQuery(
    ask.usage.queryOptions(sessionUser?.id ?? null),
  )

  // Guests see the page, but a question sends them to sign in first. The
  // question comes back in the box after sign-in. No model call runs for them.
  function onAsk(question: string) {
    if (!sessionUser) {
      void navigate({
        to: "/auth",
        search: { redirect: `/ask?q=${encodeURIComponent(question)}` },
      })
      return
    }
    if (q) void navigate({ to: "/ask", search: {}, replace: true })
    void askQuestion(question)
  }

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
            // pb-16 lifts the block a little above true center, so it sits
            // at the optical center between the header and the question box.
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-4 pb-16">
              <h1 className="sr-only">ask</h1>
              <div className="flex flex-col items-center gap-2 text-center">
                <LogoRandomScatter className="h-auto w-full max-w-64" />
                <p className="text-muted-foreground">all things une</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className={
                      index >= MOBILE_SUGGESTIONS
                        ? "hidden sm:inline-flex"
                        : undefined
                    }
                    onClick={() => onAsk(suggestion)}
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
                    // A fragment, not a wrapper: the scroller reads only its
                    // direct children, so a wrapper hides the scroll anchor
                    // and a new question does not scroll into view.
                    <Fragment key={exchange.id}>
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
                    </Fragment>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          )}
          <div className="mx-auto w-full max-w-2xl p-4 pt-0">
            <AskCompose
              busy={busy}
              defaultText={q}
              followUp={thread.length > 0}
              used={usage?.used ?? null}
              onAsk={onAsk}
            />
          </div>
        </div>
      </MessageScrollerProvider>
    </>
  )
}
