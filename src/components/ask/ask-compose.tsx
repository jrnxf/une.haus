import { useRef, useState } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "~/components/ui/input-group"

function limitNote(left: number) {
  if (left <= 0) return "you reached today's limit. ask again tomorrow."
  return `${left} ${left === 1 ? "question" : "questions"} left today.`
}

// The question box at the bottom of /ask (AI Elements prompt input). Enter
// asks, shift+enter adds a line.
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
  const canAsk = !busy && text.trim().length > 0
  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canAsk) return
        onAsk(text)
        setText("")
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          value={text}
          maxLength={2000}
          placeholder={followUp ? "ask a follow-up" : "ask anything"}
          aria-label="question"
          className="max-h-40"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              formRef.current?.requestSubmit()
            }
          }}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            type="submit"
            variant="default"
            size="sm"
            disabled={!canAsk}
            className="ml-auto"
          >
            Ask
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p className="text-muted-foreground text-center text-xs">
        {left === null
          ? "answers come from une.haus and can be wrong."
          : limitNote(left)}
      </p>
    </form>
  )
}
