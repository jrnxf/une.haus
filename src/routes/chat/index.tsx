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
    <div className="mx-auto w-full max-w-4xl p-4">
      <ChatMessagesView />
    </div>
  );
}
