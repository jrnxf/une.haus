import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowDownIcon } from "lucide-react"

import { Button } from "~/components/ui/button"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { MessagesView } from "~/views/messages"

function JumpToLatestButton() {
  return (
    <div className="flex justify-center">
      <Button variant="outline" size="sm" asChild>
        <Link to="/chat">
          jump to latest
          <ArrowDownIcon className="size-3.5" />
        </Link>
      </Button>
    </div>
  )
}

export function ChatMessagesView({ focus }: { focus?: number }) {
  const { data: chatMessages } = useSuspenseQuery(
    messages.list.queryOptions({
      type: "chat",
      id: -1,
      focus,
    }),
  )

  const { mutate: createChatMessage } = useCreateMessage({
    type: "chat",
    id: -1,
  })

  const isFocused = chatMessages.focused

  return (
    <>
      <MessagesView
        record={{ type: "chat", id: -1 }}
        messages={chatMessages.messages}
        handleCreateMessage={createChatMessage}
        scrollTargetId="main-content"
        highlightMessageId={focus}
        footer={isFocused ? <JumpToLatestButton /> : undefined}
      />
    </>
  )
}
