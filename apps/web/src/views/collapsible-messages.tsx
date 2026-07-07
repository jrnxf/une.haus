import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { useState } from "react"

import { BaseMessageForm } from "~/components/forms/message"
import { Button } from "~/components/ui/button"
import { SectionDivider } from "~/components/ui/section-divider"
import { type messages } from "~/lib/messages"
import { type MessageParent } from "~/lib/messages/schemas"
import { type ServerFnReturn } from "~/lib/types"
import { MessageGroupList } from "~/views/message-group-list"

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
            <MessageGroupList record={record} messages={visibleMessages} />
          </div>
        </>
      ) : null}

      <BaseMessageForm onSubmit={onCreateMessage} />
    </div>
  )
}
