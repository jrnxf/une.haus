import { useSuspenseQuery } from "@tanstack/react-query";

import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { MessagesView } from "~/views/messages";

export function ChatMessagesView() {
  const { data: chatMessages } = useSuspenseQuery(
    messages.list.queryOptions({
      type: "chat",
    }),
  );

  const { mutate: createChatMessage } = useCreateMessage({
    type: "chat",
  });

  return (
    <MessagesView
      record={{ type: "chat" }}
      messages={chatMessages.messages}
      onMessageCreated={createChatMessage}
    />
  );
}
