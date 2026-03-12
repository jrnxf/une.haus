import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { messages } from "~/lib/messages"
import { ChatMessagesView } from "~/views/chat-messages"

const chatSearchSchema = z.object({
  focus: z.number().positive().int().optional(),
})

export const Route = createFileRoute("/chat/")({
  validateSearch: chatSearchSchema,
  loaderDeps: ({ search }) => ({ focus: search.focus }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      messages.list.queryOptions({
        type: "chat",
        id: -1,
        focus: deps.focus,
      }),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { focus } = Route.useSearch()

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>chat</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl p-4">
        <ChatMessagesView focus={focus} />
      </div>
    </>
  )
}
