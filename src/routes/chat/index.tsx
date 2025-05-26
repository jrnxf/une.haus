import { createFileRoute } from "@tanstack/react-router";

import { messages } from "~/lib/messages";
import { ChatMessagesView } from "~/views/chat-messages";

export const Route = createFileRoute("/chat/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      messages.list.queryOptions({
        type: "chat",
      }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl grow flex-col px-4 pb-4"
      id="main-content"
    >
      <ChatMessagesView />
    </div>
  );
}
