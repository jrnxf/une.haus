import { useLocation, useNavigate } from "@tanstack/react-router"
import { CornerDownLeftIcon } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"

import { MentionTextarea } from "~/components/input/mention-textarea"
import { Button } from "~/components/ui/button"
import { useSessionUser } from "~/lib/session/hooks"

export function BaseMessageForm({
  initialContent,
  onSubmit,
  onFocus,
}: {
  initialContent?: string
  onSubmit: (content: string) => void
  onFocus?: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionUser = useSessionUser()
  const [content, setContent] = useState(initialContent ?? "")
  const [resetVersion, setResetVersion] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const prevHeight = useRef(0)
  const refocusAfterSubmitRef = useRef(false)

  const focusEditor = () => {
    const editor = formRef.current?.querySelector<HTMLElement>(
      "#content, [contenteditable]",
    )
    editor?.focus()
  }

  useLayoutEffect(() => {
    const el = formRef.current
    if (!el) return
    const h = el.offsetHeight
    if (prevHeight.current && h > prevHeight.current) {
      const main = document.getElementById("main-content")
      if (main) main.scrollTop = main.scrollHeight
    }
    prevHeight.current = h

    if (refocusAfterSubmitRef.current) {
      refocusAfterSubmitRef.current = false
      focusEditor()
    }
  })

  const reset = () => {
    setContent("")
    setResetVersion((version) => version + 1)
  }

  if (!sessionUser) {
    return (
      <button
        type="button"
        className="bg-background text-muted-foreground dark:bg-input/30 w-full rounded-lg border px-4 py-3 text-left text-sm sm:text-base"
        onClick={() => {
          navigate({ to: "/auth", search: { redirect: location.href } })
        }}
      >
        write a message...
      </button>
    )
  }

  return (
    <form
      ref={formRef}
      className="bg-background focus-within:ring-ring relative w-full overflow-clip rounded-lg border focus-within:ring-2"
      method="post"
      onClick={(event) => {
        // Click anywhere in the form border area → focus the editor
        if (
          event.target === event.currentTarget ||
          !(event.target as HTMLElement).closest("[contenteditable], button")
        ) {
          focusEditor()
        }
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (!content) return
        onSubmit(content)
        refocusAfterSubmitRef.current = true
        reset()
      }}
    >
      <div className="dark:bg-input/30 flex items-end bg-transparent px-2">
        <div className="min-w-0 flex-1">
          <MentionTextarea
            key={`mention-textarea-${resetVersion}`}
            value={content}
            onChange={setContent}
            className="[field-sizing:content] min-h-11 w-full resize-none rounded-none border-0 border-transparent px-1.5 py-3 text-sm shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-base dark:bg-transparent"
            id="content"
            rows={1}
            placeholder="write a message..."
            onFocus={onFocus}
            onSubmit={() => {
              if (content) {
                onSubmit(content)
                refocusAfterSubmitRef.current = true
                reset()
              }
            }}
          />
        </div>
        <Button
          type="submit"
          size="icon-sm"
          variant="secondary"
          className="mb-1.5 sm:mb-2"
          aria-label="submit"
          onClick={() => {
            if (!content) {
              focusEditor()
            }
          }}
        >
          <CornerDownLeftIcon className="size-4" />
        </Button>
      </div>
    </form>
  )
}
