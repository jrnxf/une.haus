import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { SandboxBrowser } from "~/components/sandbox-browser"
import { tricks } from "~/lib/tricks"
import { users } from "~/lib/users"

const sandboxSearchSchema = z.object({
  component: z.string().optional(),
})

export const Route = createFileRoute("/sandbox")({
  validateSearch: sandboxSearchSchema,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(users.all.queryOptions()),
      context.queryClient.ensureQueryData(tricks.elements.list.queryOptions()),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>sandbox</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <SandboxBrowser />
    </div>
  )
}
