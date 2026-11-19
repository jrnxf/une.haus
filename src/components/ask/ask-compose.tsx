import { CornerDownLeftIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "~/components/ui/button"

function limitNote(left: number) {
  if (left <= 0) return "you reached today's limit. ask again tomorrow."
  return `${left} ${left === 1 ? "question" : "questions"} left today.`
}

// The question box at the bottom of /ask. It matches the /chat message box:
// one line that grows with its text. Enter asks, shift+enter adds a line.
export function AskCompose({
  busy,
  followUp,
  left,
  onAsk,
}: {
  busy: boolean
  followUp: boolean
  // Questions left today, or null while there are plenty.
  left: number | null
  onAsk: (question: string) => void
}) {
  const [text, setText] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canAsk = !busy && text.trim().length > 0
  return (
    <div className="flex flex-col gap-2">
      <form
        ref={formRef}
        className="bg-background focus-within:ring-ring relative w-full overflow-clip rounded-lg border focus-within:ring-2"
        onClick={(event) => {
          // A click on the border area focuses the textarea.
          if (!(event.target as HTMLElement).closest("textarea, button")) {
            textareaRef.current?.focus()
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          if (!canAsk) return
          onAsk(text)
          setText("")
        }}
      >
        <div className="dark:bg-input/30 flex items-end bg-transparent px-2">
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            maxLength={2000}
            placeholder={followUp ? "ask a follow-up..." : "ask anything..."}
            aria-label="question"
            className="placeholder:text-muted-foreground field-sizing-content max-h-40 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-3 text-sm outline-none sm:text-base"
            onChange={(event) => setText(event.target.value)}
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
          <Button
            type="submit"
            size="icon-sm"
            variant="secondary"
            className="mb-1.5 sm:mb-2"
            aria-label="ask"
            disabled={!canAsk}
          >
            <CornerDownLeftIcon className="size-4" />
          </Button>
        </div>
      </form>
      <p className="text-muted-foreground text-center text-xs">
        {left === null
          ? "answers come from une.haus and can be wrong."
          : limitNote(left)}
      </p>
    </div>
  )
}
