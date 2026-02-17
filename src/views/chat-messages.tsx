import { useSuspenseQuery } from "@tanstack/react-query";

import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { MessagesView } from "~/views/messages";

export function ChatMessagesView() {
  const { data: chatMessages } = useSuspenseQuery(
    messages.list.queryOptions({
      type: "chat",
      id: -1,
    }),
  );

  const { mutate: createChatMessage } = useCreateMessage({
    type: "chat",
    id: -1,
  });

  return (
    <MessagesView
      record={{ type: "chat", id: -1 }}
      messages={chatMessages.messages}
      handleCreateMessage={createChatMessage}
      scrollTargetId="main-content"
    />
  );
}
