import { Link } from "@tanstack/react-router"
import { type ComponentProps, type ElementType, use, useMemo } from "react"
import { type DefaultComponents, Streamdown } from "streamdown"

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
        <div
          className={
            link.kind === "rider"
              ? "bg-muted size-12 overflow-hidden rounded-full"
              : "bg-muted aspect-video w-full overflow-hidden rounded-md"
          }
        >
          <img
            src={link.poster}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            style={{ transform: `scale(${link.posterScale})` }}
          />
        </div>
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

// Streamdown styles these tags itself. Plain tags keep the prose look.
const plain =
  <Tag extends "ul" | "ol" | "li" | "strong" | "code">(tag: Tag) =>
  ({ node: _node, ...props }: ComponentProps<Tag> & { node?: unknown }) => {
    const Element = tag as ElementType
    return <Element {...props} />
  }

// Paragraphs wrap greedily, not with the global text-wrap: pretty. Pretty
// lays out the whole paragraph again as words arrive, so earlier lines
// change their breaks and words jump between lines while the answer shows.
function Paragraph({
  node: _node,
  ...props
}: ComponentProps<"p"> & { node?: unknown }) {
  return <p {...props} className="text-wrap" />
}

const components: Partial<DefaultComponents> = {
  a: AnswerLink,
  p: Paragraph,
  ul: plain("ul"),
  ol: plain("ol"),
  li: plain("li"),
  strong: plain("strong"),
  code: plain("code"),
}

// New words fade in as the answer shows. See usePacedText.
const animated = { animation: "fadeIn", duration: 150 } as const

// An answer from /api/ask. links holds the previews for its une.haus links.
// They arrive when the answer ends, so the links preview only from then.
// Streamdown closes half-written markdown (an open ** or link) while the
// text grows, so it never shows raw syntax.
export function AskMarkdown({
  children,
  links,
  streaming,
}: {
  children: string
  links: AskCard[]
  streaming: boolean
}) {
  const byPath = useMemo(
    () => new Map(links.map((link) => [link.path, link])),
    [links],
  )
  return (
    <AskLinksContext value={byPath}>
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
        <Streamdown
          allowedElements={allowed}
          unwrapDisallowed
          skipHtml
          components={components}
          linkSafety={{ enabled: false }}
          controls={false}
          animated={animated}
          isAnimating={streaming}
        >
          {children}
        </Streamdown>
      </div>
    </AskLinksContext>
  )
}
