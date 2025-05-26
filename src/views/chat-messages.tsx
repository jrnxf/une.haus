import { useSuspenseQuery } from "@tanstack/react-query";

import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { MessagesView } from "~/views/messages";

export function ChatMessagesView() {
  const { data: chatMessages } = useSuspenseQuery(
    messages.list.queryOptions({
      recordId: -1,
      type: "chat",
    }),
  );

  const { mutate: createChatMessage } = useCreateMessage({
    recordId: -1,
    type: "chat",
  });

  return (
    <MessagesView
      record={{ recordId: -1, type: "chat" }}
      messages={chatMessages.messages}
      onMessageCreated={createChatMessage}
    />
  );
}
