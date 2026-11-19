import { Link } from "@tanstack/react-router"
import { type ComponentProps } from "react"
import Markdown, { type Components } from "react-markdown"

// The prompt asks for links, bold and lists only. Anything else is unwrapped
// to its text, and raw HTML never renders.
const allowed = ["p", "a", "strong", "em", "ul", "ol", "li", "code", "br"]

// Links to une.haus pages navigate in the app. Other links open a new tab.
function AnswerLink({ href, children }: ComponentProps<"a">) {
  if (href?.startsWith("/")) return <Link to={href}>{children}</Link>
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

const components: Components = { a: AnswerLink }

// An answer from /api/ask.
export function AskMarkdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
      <Markdown
        allowedElements={allowed}
        unwrapDisallowed
        components={components}
      >
        {children}
      </Markdown>
    </div>
  )
}
