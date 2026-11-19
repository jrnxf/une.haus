import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import { type messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useSessionUser } from "~/lib/session/hooks"
import { type ServerFnReturn } from "~/lib/types"
import { cn } from "~/lib/utils"

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number]

/**
 * One message in a list grouped by consecutive author. The first message of
 * a run shows the author label, and the current user's messages align to the
 * right. `prev` is the message before it, or undefined for the first one.
 *
 * `withAnchors` adds the `#message-{id}` id and `data-slot="message"` that
 * MessagesView's scroll choreography queries by selector. `insetAuthor` nudges
 * the author label toward the aligned bubble edge (used by the embedded chat
 * layout).
 */
export function MessageGroupRow({
  record,
  message,
  prev,
  withAnchors = false,
  insetAuthor = false,
}: {
  record: MessageParent
  message: Message
  prev: Message | undefined
  withAnchors?: boolean
  insetAuthor?: boolean
}) {
  const sessionUser = useSessionUser()
  const isAuthUserMessage = Boolean(
    sessionUser && sessionUser.id === message.user.id,
  )
  const isNewSection = prev?.user.id !== message.user.id
  return (
    <div
      id={withAnchors ? `message-${message.id}` : undefined}
      data-slot={withAnchors ? "message" : undefined}
      className={cn(
        "flex max-w-full flex-col",
        isAuthUserMessage && "items-end",
      )}
    >
      {isNewSection && (
        <div
          className={cn(
            "mb-1",
            insetAuthor && (isAuthUserMessage ? "mr-1" : "ml-1"),
            prev && "mt-4",
          )}
        >
          <MessageAuthor message={message} />
        </div>
      )}
      <MessageBubble parent={record} message={message} />
    </div>
  )
}

/**
 * Renders a message list grouped by consecutive author. Purely presentational
 * — scroll behavior and show-more state live in the views that use it.
 */
export function MessageGroupList({
  record,
  messages,
  withAnchors = false,
  insetAuthor = false,
}: {
  record: MessageParent
  messages: Message[]
  withAnchors?: boolean
  insetAuthor?: boolean
}) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageGroupRow
          key={message.id}
          record={record}
          message={message}
          prev={messages[index - 1]}
          withAnchors={withAnchors}
          insetAuthor={insetAuthor}
        />
      ))}
    </>
  )
}
