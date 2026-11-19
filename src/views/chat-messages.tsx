import { useMessageScroller } from "@shadcn/react/message-scroller"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowDownIcon } from "lucide-react"
import { useLayoutEffect } from "react"

import { BaseMessageForm } from "~/components/forms/message"
import { Button } from "~/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { MessageGroupRow } from "~/views/message-group-list"

const record = { type: "chat", id: -1 } as const

function JumpToLatestButton() {
  return (
    <div className="flex justify-center">
      <Button variant="outline" size="sm" asChild>
        <Link to="/chat">
          jump to latest
          <ArrowDownIcon data-icon="inline-end" className="size-3.5" />
        </Link>
      </Button>
    </div>
  )
}

// The chat fills the page: the transcript scrolls, the form stays below it.
// The scroller opens at the latest message and follows new ones while the
// reader is at the bottom. With `focus`, it opens on that message instead.
export function ChatMessagesView({ focus }: { focus?: number }) {
  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition={focus ? "start" : "end"}
    >
      <ChatTranscript focus={focus} />
    </MessageScrollerProvider>
  )
}

function ChatTranscript({ focus }: { focus?: number }) {
  const { data: chatMessages } = useSuspenseQuery(
    messages.list.queryOptions({ ...record, focus }),
  )
  const { mutate: createChatMessage } = useCreateMessage(record)
  const { scrollToEnd, scrollToMessage } = useMessageScroller()

  // Center the focused message and make its bubble glow. This syncs with
  // the scroll position, an outside system, so it needs an effect.
  useLayoutEffect(() => {
    if (!focus) return
    scrollToMessage(`message-${focus}`, { align: "center" })
    document
      .querySelector(`#message-${focus} [data-slot="message-bubble"]`)
      ?.classList.add("animate-highlight-glow")
  }, [focus, scrollToMessage])

  const list = chatMessages.messages

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          {/* Rows clip what overflows them (content-visibility), and a like
              badge sits half above its bubble. So the space between rows is
              top padding inside each row, not a gap between them. */}
          <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-0 px-4 pt-2 pb-4">
            {list.map((message, index) => (
              <MessageScrollerItem
                key={message.id}
                messageId={`message-${message.id}`}
                className="pt-2"
              >
                <MessageGroupRow
                  record={record}
                  message={message}
                  prev={list[index - 1]}
                  withAnchors
                  insetAuthor
                />
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        {chatMessages.focused ? (
          <JumpToLatestButton />
        ) : (
          <BaseMessageForm
            onSubmit={(content) => {
              createChatMessage(content)
              scrollToEnd()
            }}
          />
        )}
      </div>
    </div>
  )
}
