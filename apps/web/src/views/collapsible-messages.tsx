import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useState } from "react"

import { BaseMessageForm } from "~/components/forms/message"
import { MessageAuthor } from "~/components/messages/message-author"
import { MessageBubble } from "~/components/messages/message-bubble"
import { Button } from "~/components/ui/button"
import { SectionDivider } from "~/components/ui/section-divider"
import { type messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { useSessionUser } from "~/lib/session/hooks"
import { type ServerFnReturn } from "~/lib/types"
import { cn } from "~/lib/utils"

type MessageType = ServerFnReturn<typeof messages.list.fn>["messages"][number]

type CollapsibleMessagesProps = {
  record: MessageParent
  messages: MessageType[]
  onCreateMessage: (content: string) => void
  initialVisibleCount?: number
}

export function CollapsibleMessages({
  record,
  messages: messageList,
  onCreateMessage,
  initialVisibleCount = 3,
}: CollapsibleMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const sessionUser = useSessionUser()

  const hasMoreMessages = messageList.length > initialVisibleCount
  const visibleMessages = isExpanded
    ? messageList
    : messageList.slice(-initialVisibleCount)
  const hiddenCount = messageList.length - initialVisibleCount

  return (
    <div className="space-y-3">
      <SectionDivider>
        {messageList.length} {messageList.length === 1 ? "message" : "messages"}
      </SectionDivider>
      {messageList.length > 0 ? (
        <>
          <div className="flex items-center justify-end">
            {hasMoreMessages && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1 text-xs"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    show less
                    <ChevronUpIcon className="size-3" />
                  </>
                ) : (
                  <>
                    show {hiddenCount} more
                    <ChevronDownIcon className="size-3" />
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {visibleMessages.map((message, index) => {
              const isAuthUserMessage = Boolean(
                sessionUser && sessionUser.id === message.user.id,
              )
              const prevMessage = visibleMessages[index - 1]
              const isNewSection = prevMessage?.user.id !== message.user.id

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex max-w-full flex-col",
                    isAuthUserMessage && "items-end",
                  )}
                >
                  {isNewSection && (
                    <div className={cn("mb-1", index !== 0 && "mt-4")}>
                      <MessageAuthor message={message} />
                    </div>
                  )}
                  <MessageBubble parent={record} message={message} />
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      <BaseMessageForm onSubmit={onCreateMessage} />
    </div>
  )
}
