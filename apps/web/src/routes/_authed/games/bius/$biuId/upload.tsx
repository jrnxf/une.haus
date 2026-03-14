import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import {
  BackUpSetForm,
  CreateFirstSetForm,
} from "~/components/forms/games/bius"
import { PageHeader } from "~/components/page-header"
import { games } from "~/lib/games"
import { invariant } from "~/lib/invariant"
import { session } from "~/lib/session/index"

const paramsSchema = z.object({
  biuId: z.coerce.number().int().positive(),
})

export const Route = createFileRoute("/_authed/games/bius/$biuId/upload")({
  component: RouteComponent,
  params: {
    parse: paramsSchema.parse,
  },
  loader: async ({ context, params }) => {
    const rounds = await context.queryClient.ensureQueryData(
      games.bius.rounds.queryOptions(),
    )

    const round = rounds.find((c) => c.id === params.biuId)
    if (!round) {
      throw redirect({ to: "/games", replace: true })
    }
  },
  onError: async () => {
    await session.flash.set.fn({
      data: { type: "error", message: "invalid upload link" },
    })
    throw redirect({ to: "/games" })
  },
})

function RouteComponent() {
  const { biuId } = Route.useParams()
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())
  const round = rounds.find((c) => c.id === biuId)

  invariant(round, "Round not found")

  const latestSet = round.sets?.find((set) => !set.deletedAt)

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb to="/games/bius">back it up</PageHeader.Crumb>
          <PageHeader.Crumb>upload</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        {latestSet ? (
          <BackUpSetForm roundId={round.id} />
        ) : (
          <CreateFirstSetForm roundId={round.id} />
        )}
      </div>
    </>
  )
}
