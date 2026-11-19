import { useState } from "react"

import { Button } from "~/components/ui/button"
import { Textarea } from "~/components/ui/textarea"

// The question box at the bottom of /ask. Enter asks, shift+enter adds a line.
function limitNote(left: number) {
  if (left <= 0) return "you reached today's limit. ask again tomorrow."
  return `${left} ${left === 1 ? "question" : "questions"} left today.`
}

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
  const submit = () => {
    if (busy || !text.trim()) return
    onAsk(text)
    setText("")
  }
  return (
    <form
      className="bg-background sticky bottom-0 flex flex-col gap-2 py-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex items-end gap-2">
        <Textarea
          size="compact"
          value={text}
          maxLength={2000}
          placeholder={followUp ? "ask a follow-up" : "ask anything"}
          aria-label="question"
          className="max-h-40"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <Button type="submit" disabled={busy || !text.trim()}>
          Ask
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        {left === null
          ? "answers come from une.haus and can be wrong."
          : limitNote(left)}
      </p>
    </form>
  )
}
