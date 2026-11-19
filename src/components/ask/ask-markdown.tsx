import { Link } from "@tanstack/react-router"
import { type ComponentProps, use, useMemo } from "react"
import Markdown, { type Components } from "react-markdown"

import { AskLinksContext } from "~/components/ask/ask-links-context"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card"
import { type AskCard } from "~/lib/ask/schemas"

// The prompt asks for links, bold and lists only. Anything else is unwrapped
// to its text, and raw HTML never renders.
const allowed = ["p", "a", "strong", "em", "ul", "ol", "li", "code", "br"]

// What a linked post, rider, trick or video is, shown on hover (the AI
// Elements inline citation pattern). Touch screens skip it: a tap follows
// the link.
function Preview({ link }: { link: AskCard }) {
  return (
    <div className="flex flex-col gap-2">
      {link.poster ? (
        <img
          src={link.poster}
          alt=""
          loading="lazy"
          className={
            link.kind === "rider"
              ? "bg-muted size-12 rounded-full object-cover"
              : "bg-muted aspect-video w-full rounded-md object-cover"
          }
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="font-medium">{link.title}</span>
        <span className="text-muted-foreground text-xs">{link.subtitle}</span>
      </div>
      {link.description ? (
        <p className="text-muted-foreground text-xs">{link.description}</p>
      ) : null}
    </div>
  )
}

// Links to une.haus pages navigate in the app, with a preview when the
// answer has one. Other links open a new tab.
function AnswerLink({ href, children }: ComponentProps<"a">) {
  const links = use(AskLinksContext)
  if (!href?.startsWith("/")) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  const link = links.get(href)
  if (!link) return <Link to={href}>{children}</Link>
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        closeDelay={100}
        render={<Link to={href} />}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent>
        <Preview link={link} />
      </HoverCardContent>
    </HoverCard>
  )
}

const components: Components = { a: AnswerLink }

// An answer from /api/ask. links holds the previews for its une.haus links.
// They arrive when the answer ends, so the links preview only from then.
export function AskMarkdown({
  children,
  links,
}: {
  children: string
  links: AskCard[]
}) {
  const byPath = useMemo(
    () => new Map(links.map((link) => [link.path, link])),
    [links],
  )
  return (
    <AskLinksContext value={byPath}>
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
        <Markdown
          allowedElements={allowed}
          unwrapDisallowed
          components={components}
        >
          {children}
        </Markdown>
      </div>
    </AskLinksContext>
  )
}
