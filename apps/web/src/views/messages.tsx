import { BaseMessageForm } from "~/components/forms/message"
import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "~/components/ui/message-scroller"
import { type messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useSessionUser } from "~/lib/session/hooks"
import { type ServerFnReturn } from "~/lib/types"
import { cn } from "~/lib/utils"

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number]

// "fill" → dedicated full-height chat: the scroller owns its own bounded scroll
// region with a pinned footer. "inline" → an embedded comment thread that flows
// inside a longer page; the page itself does the scrolling.
type MessagesVariant = "fill" | "inline"

type MessagesViewProps = {
  record: MessageParent
  messages: Message[]
  handleCreateMessage: (newMessage: string) => void
  highlightMessageId?: number
  footer?: React.ReactNode
  variant?: MessagesVariant
}

export function MessagesView({
  record,
  messages,
  handleCreateMessage,
  highlightMessageId,
  footer,
  variant = "inline",
}: MessagesViewProps) {
  const sessionUser = useSessionUser()

  const renderRow = (message: Message, index: number) => {
    const prev = messages[index - 1]
    return (
      <MessageRow
        key={message.id}
        record={record}
        message={message}
        isOwn={Boolean(sessionUser && sessionUser.id === message.user.id)}
        showAuthor={prev?.user.id !== message.user.id}
        isFirst={index === 0}
        focusedMessageId={highlightMessageId}
      />
    )
  }

  if (variant === "fill") {
    return (
      <MessageScrollerProvider
        autoScroll
        // SSR-declarative initial position: newest message pinned to the
        // bottom, or the focused message when arriving via a deep link.
        defaultScrollPosition={highlightMessageId ? "last-anchor" : "end"}
        // Match the old "within 400px of the bottom counts as pinned" rule.
        scrollEdgeThreshold={400}
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {messages.map((message, index) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={String(message.id)}
                    scrollAnchor={message.id === highlightMessageId}
                  >
                    {renderRow(message, index)}
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            {/* jump-to-latest: a scroll button that auto-hides at the bottom
                edge. Hidden in focus mode, where the footer owns "load latest"
                (a navigation back to the live window). */}
            {!highlightMessageId && <MessageScrollerButton />}
          </MessageScroller>

          <FillFooter footer={footer} onSend={handleCreateMessage} />
        </div>
      </MessageScrollerProvider>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message, index) => renderRow(message, index))}
      <div className="pt-2">
        {footer ?? <BaseMessageForm onSubmit={handleCreateMessage} />}
      </div>
    </div>
  )
}

function FillFooter({
  footer,
  onSend,
}: {
  footer?: React.ReactNode
  onSend: (newMessage: string) => void
}) {
  const { scrollToEnd } = useMessageScroller()

  if (footer) {
    return <div className="shrink-0">{footer}</div>
  }

  return (
    <div className="shrink-0">
      <BaseMessageForm
        onSubmit={(newMessage) => {
          onSend(newMessage)
          // Sending your own message always returns you to the bottom, even
          // when scrolled up; autoScroll then follows subsequent messages.
          scrollToEnd({ behavior: "instant" })
        }}
      />
    </div>
  )
}

function MessageRow({
  record,
  message,
  isOwn,
  showAuthor,
  isFirst,
  focusedMessageId,
}: {
  record: MessageParent
  message: Message
  isOwn: boolean
  showAuthor: boolean
  isFirst: boolean
  focusedMessageId?: number
}) {
  return (
    <div
      id={`message-${message.id}`}
      data-slot="message"
      data-focused={message.id === focusedMessageId ? "true" : undefined}
      className={cn(
        "flex max-w-full flex-col",
        isOwn && "items-end",
        showAuthor && !isFirst && "mt-4",
      )}
    >
      {showAuthor && (
        <div className={cn(isOwn ? "mr-1" : "ml-1")}>
          <MessageAuthor message={message} />
        </div>
      )}
      <MessageBubble parent={record} message={message} />
    </div>
  )
}
