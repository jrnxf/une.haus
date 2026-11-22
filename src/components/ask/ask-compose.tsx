import { CornerDownLeftIcon } from "lucide-react"
import { useCallback, useRef, useState } from "react"

import { AskMeter } from "~/components/ask/ask-meter"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

const MAX_LENGTH = 2000

// The question box of the ask page and the home board. It is one line that grows
// with its text. Enter asks, shift+enter adds a line.
//
// The meter and the ask button sit in the bottom right corner, and the text
// wraps around them: an empty inline block at the end of the text holds their
// space on the last line only, like the time on a chat bubble. A textarea
// cannot do that, so the box is a plain-text contenteditable.
export function AskCompose({
  busy,
  defaultText = "",
  followUp,
  used,
  onAsk,
}: {
  busy: boolean
  // Text to start with, such as a question a guest typed before sign-in.
  defaultText?: string
  followUp: boolean
  // The share of today's budget used, as a whole percent. Null when there is
  // no limit: a guest or the owner.
  used: number | null
  onAsk: (question: string) => void
}) {
  const [text, setText] = useState(defaultText)
  const formRef = useRef<HTMLFormElement>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const spent = used !== null && used >= 100
  const canAsk = !busy && !spent && text.trim().length > 0
  const empty = text === "" || text === "\n"

  // The editor is not a React-controlled input, so the first text goes in
  // once, when it mounts.
  const attachEditor = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !editorRef.current) node.textContent = defaultText
      editorRef.current = node
    },
    // oxlint-disable-next-line react/exhaustive-deps -- the first text only
    [],
  )

  return (
    <div className="flex flex-col gap-2">
      <form
        ref={formRef}
        className="bg-background focus-within:ring-ring relative w-full overflow-clip rounded-lg border focus-within:ring-2"
        onClick={(event) => {
          // A click on the border area focuses the editor.
          if (
            !(event.target as HTMLElement).closest("[role=textbox], button")
          ) {
            editorRef.current?.focus()
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canAsk) return
          onAsk(text)
          if (editorRef.current) editorRef.current.textContent = ""
          setText("")
        }}
      >
        <div className="dark:bg-input/30 relative max-h-40 overflow-y-auto bg-transparent px-2">
          {empty ? (
            <span
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute inset-x-3.5 top-2.5 truncate text-sm leading-6 sm:text-base"
            >
              {followUp ? "ask a follow-up..." : "ask anything..."}
            </span>
          ) : null}
          <div
            ref={attachEditor}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            role="textbox"
            aria-multiline
            aria-label="question"
            aria-placeholder={
              followUp ? "ask a follow-up..." : "ask anything..."
            }
            tabIndex={0}
            className={cn(
              "min-h-11 px-1.5 py-2.5 text-sm leading-6 break-words whitespace-pre-wrap outline-none sm:text-base",
              // An emptied box keeps a <br>, and the spacer would wrap
              // to a second line under it. The box has no text to wrap
              // then, so it needs no spacer.
              empty
                ? "after:hidden"
                : used === null
                  ? "after:inline-block after:w-7"
                  : "after:inline-block after:w-13",
            )}
            onInput={(event) => {
              const node = event.currentTarget
              let value = node.innerText
              if (value.length > MAX_LENGTH) {
                value = value.slice(0, MAX_LENGTH)
                node.textContent = value
                // Put the caret back at the end.
                const selection = window.getSelection()
                selection?.selectAllChildren(node)
                selection?.collapseToEnd()
              }
              setText(value)
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
          />
        </div>
        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
          {used === null ? null : <AskMeter used={used} />}
          <Button
            type="submit"
            size="icon-xs"
            variant="secondary"
            // A larger hidden hit area, so the small button is easy to tap.
            className="relative after:absolute after:-inset-1"
            aria-label="ask"
            disabled={!canAsk}
          >
            {/* The arrow and the bar put the ink low in the icon's box. The
                shifted viewBox lifts it 0.5px, so it looks centered. */}
            <CornerDownLeftIcon className="size-3.5" viewBox="0 0.85 24 24" />
          </Button>
        </div>
      </form>
      {spent ? (
        <p className="text-muted-foreground text-center text-xs">
          you reached today&apos;s limit. ask again tomorrow.
        </p>
      ) : null}
    </div>
  )
}
