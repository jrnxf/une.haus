import { Link, useLocation } from "@tanstack/react-router"
import { CornerDownLeftIcon } from "lucide-react"
import { useState } from "react"

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
  const sessionUser = useSessionUser()
  const [content, setContent] = useState(initialContent ?? "")
  const [resetVersion, setResetVersion] = useState(0)

  const reset = () => {
    setContent("")
    setResetVersion((version) => version + 1)
  }

  if (!sessionUser) {
    return (
      <div className="grid place-items-center pt-3">
        <Button asChild>
          <Link
            to="/auth"
            search={{
              redirect: location.href,
            }}
          >
            log in to chat
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      className="bg-background focus-within:ring-ring relative w-full overflow-clip rounded-lg border focus-within:ring-2"
      method="post"
      onClick={(event) => {
        // Click anywhere in the form border area → focus the editor
        if (
          event.target === event.currentTarget ||
          !(event.target as HTMLElement).closest("[contenteditable], button")
        ) {
          document.getElementById("content")?.focus()
        }
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (!content) return
        onSubmit(content)
        reset()
      }}
    >
      <div className="dark:bg-input/30 flex items-end bg-transparent px-2">
        <div className="w-full">
          <MentionTextarea
            key={`mention-textarea-${resetVersion}`}
            value={content}
            onChange={setContent}
            className="[field-sizing:content] min-h-11 w-full resize-none rounded-none border-0 border-transparent px-1.5 py-3 text-base shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
            id="content"
            rows={1}
            placeholder="write a message..."
            onFocus={onFocus}
            onSubmit={() => {
              if (content) {
                onSubmit(content)
                reset()
              }
            }}
          />
        </div>
        <Button
          type="submit"
          size="icon-sm"
          variant="secondary"
          className="mb-2"
          aria-label="submit"
          onClick={() => {
            if (!content) {
              // Focus the tiptap editor contenteditable
              const el = document.getElementById("content")
              if (el) {
                el.focus()
              } else {
                document
                  .querySelector<HTMLElement>("[contenteditable]")
                  ?.focus()
              }
            }
          }}
        >
          <CornerDownLeftIcon className="size-4" />
        </Button>
      </div>
    </form>
  )
}
