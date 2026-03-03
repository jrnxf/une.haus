import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { BackUpSetForm } from "~/components/forms/games/bius"
import { PageHeader } from "~/components/page-header"
import { games } from "~/lib/games"
import { session } from "~/lib/session/index"

const searchSchema = z.object({
  parentSetId: z.coerce.number(),
})

export const Route = createFileRoute("/_authed/games/bius/upload")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(games.bius.rounds.queryOptions())
  },
  onError: async () => {
    await session.flash.set.fn({ data: { message: "Invalid upload link" } })
    throw redirect({ to: "/games/bius" })
  },
})

function RouteComponent() {
  const { parentSetId } = Route.useSearch()
  const { data: chains } = useSuspenseQuery(games.bius.rounds.queryOptions())

  const parentSet = chains
    .flatMap((c) => c.sets ?? [])
    .find((s) => s.id === parentSetId)

  if (!parentSet) {
    return null
  }

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/bius">back it up</PageHeader.Crumb>
          <PageHeader.Crumb>upload</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-lg space-y-6 p-6">
        <p className="text-muted-foreground text-sm">
          backing up: {parentSet.name}
        </p>
        <BackUpSetForm parentSetId={parentSet.id} />
      </div>
    </>
  )
}
