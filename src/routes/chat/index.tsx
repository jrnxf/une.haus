import { createFileRoute } from "@tanstack/react-router";

import { messages } from "~/lib/messages";
import { ChatMessagesView } from "~/views/chat-messages";

import { PageHeader } from "~/components/page-header";

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
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>chat</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4">
        <ChatMessagesView />
      </div>
    </>
  );
}
