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
import { useAskThread } from "~/lib/ask/hooks"
import { SITE_NAME, SITE_URL, seo } from "~/lib/seo"
import { useSessionUser } from "~/lib/session/hooks"

// q holds a question a guest typed before sign-in, so it waits in the box.
const homeSearchSchema = z.object({
  q: z.string().max(2000).optional(),
})

export const Route = createFileRoute("/")({
  validateSearch: homeSearchSchema,
  head: () =>
    seo({
      title: SITE_NAME,
      description:
        "une.haus — all things une. play games, post, chat, and connect with riders worldwide.",
      path: "/",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description:
        "all things une. play games, post, chat, and connect with riders worldwide.",
      inLanguage: "en-US",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/apple-touch-icon.png`,
      },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: SITE_NAME,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      description:
        "all things une. play games, post, chat, and connect with riders worldwide.",
      inLanguage: "en-US",
    },
    {
      "@type": "SiteNavigationElement",
      "@id": `${SITE_URL}/#navigation`,
      name: "main navigation",
      hasPart: [
        {
          "@type": "SiteNavigationElement",
          name: "games",
          url: `${SITE_URL}/games`,
        },
        {
          "@type": "SiteNavigationElement",
          name: "chat",
          url: `${SITE_URL}/chat`,
        },
        {
          "@type": "SiteNavigationElement",
          name: "users",
          url: `${SITE_URL}/users`,
        },
        {
          "@type": "SiteNavigationElement",
          name: "posts",
          url: `${SITE_URL}/posts`,
        },
      ],
    },
  ],
}

function RouteComponent() {
  const sessionUser = useSessionUser()
  const { q } = Route.useSearch()
  const navigate = useNavigate()
  const { thread, busy, left, ask, reset } = useAskThread()

  // Guests see the page, but a question sends them to sign in first. The
  // question comes back in the box after sign-in. No model call runs for them.
  function onAsk(question: string) {
    if (!sessionUser) {
      void navigate({
        to: "/auth",
        search: { redirect: `/?q=${encodeURIComponent(question)}` },
      })
      return
    }
    if (q) void navigate({ to: "/", search: {}, replace: true })
    void ask(question)
  }

  return (
    <>
      <PageHeader>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MessageScrollerProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          {thread.length === 0 ? (
            // pb-16 lifts the block a little above true center, so it sits
            // at the optical center between the header and the question box.
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-4 pb-16">
              <h1 className="sr-only">{SITE_NAME}</h1>
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
              left={left}
              onAsk={onAsk}
            />
          </div>
        </div>
      </MessageScrollerProvider>
    </>
  )
}
