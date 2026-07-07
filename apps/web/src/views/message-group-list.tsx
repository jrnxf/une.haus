import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import { type messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useSessionUser } from "~/lib/session/hooks"
import { type ServerFnReturn } from "~/lib/types"
import { cn } from "~/lib/utils"

type Message = ServerFnReturn<typeof messages.list.fn>["messages"][number]

/**
 * Renders a message list grouped by consecutive author: each run of messages
 * from the same user shows one author label, and the current user's messages
 * align to the right. Purely presentational — scroll behavior and show-more
 * state live in the views that use it.
 *
 * `withAnchors` adds the `#message-{id}` id and `data-slot="message"` that
 * MessagesView's scroll choreography queries by selector. `insetAuthor` nudges
 * the author label toward the aligned bubble edge (used by the embedded chat
 * layout).
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
  const sessionUser = useSessionUser()

  return (
    <>
      {messages.map((message, index) => {
        const prev = messages[index - 1]
        const isAuthUserMessage = Boolean(
          sessionUser && sessionUser.id === message.user.id,
        )
        const isNewSection = prev?.user.id !== message.user.id
        return (
          <div
            key={message.id}
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
                  index !== 0 && "mt-4",
                )}
              >
                <MessageAuthor message={message} />
              </div>
            )}
            <MessageBubble parent={record} message={message} />
          </div>
        )
      })}
    </>
  )
}
