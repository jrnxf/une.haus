import { createFileRoute } from "@tanstack/react-router";

import { messages } from "~/lib/messages";
import { ChatMessagesView } from "~/views/chat-messages";

export const Route = createFileRoute("/chat/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      messages.list.queryOptions({
        type: "chat",
        id: -1,
      }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-full min-h-0 flex-1">
      <ChatMessagesView />
    </div>
  );
}
