import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { AddSetForm } from "~/components/forms/games/sius"
import { PageHeader } from "~/components/page-header"
import { games } from "~/lib/games"
import { session } from "~/lib/session/index"

const searchSchema = z.object({
  parentSetId: z.coerce.number(),
})

export const Route = createFileRoute("/_authed/games/sius/upload")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ parentSetId: search.parentSetId }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      games.sius.rounds.active.queryOptions(),
    )

    // Prefetch trick line for the form
    await context.queryClient.ensureQueryData(
      games.sius.sets.line.queryOptions({ setId: deps.parentSetId }),
    )
  },
  onError: async () => {
    await session.flash.set.fn({ data: { message: "Invalid upload link" } })
    throw redirect({ to: "/games/sius" })
  },
})

function RouteComponent() {
  const { parentSetId } = Route.useSearch()
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )

  const parentSet = rounds
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
          <PageHeader.Crumb to="/games/sius">stack it up</PageHeader.Crumb>
          <PageHeader.Crumb>upload</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-lg space-y-6 p-6">
        <AddSetForm parentSetId={parentSet.id} />
      </div>
    </>
  )
}
