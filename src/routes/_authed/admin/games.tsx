import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import pluralize from "pluralize"

import { StartRoundForm as SiusStartRoundForm } from "~/components/forms/games/sius"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { games } from "~/lib/games"
import { useAdminRotateRius } from "~/lib/games/rius/hooks"

export const Route = createFileRoute("/_authed/admin/games")({
  loader: async ({ context }) => {
    if (context.user.id !== 1) {
      throw new Error("Not authorized")
    }

    await Promise.all([
      context.queryClient.ensureQueryData(
        games.sius.rounds.active.queryOptions(),
      ),
      context.queryClient.ensureQueryData(games.bius.rounds.queryOptions()),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/admin">admin</PageHeader.Crumb>
          <PageHeader.Crumb>games</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <RiuSection />
        <SiusSection />
        <BiusSection />
      </div>
    </>
  )
}

function RiuSection() {
  const rotateRius = useAdminRotateRius()

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="space-y-2">
          <CardTitle>rack it up</CardTitle>
          <CardDescription>rotate the active RIU set</CardDescription>
        </div>
        <Button
          onClick={() => rotateRius.mutate({})}
          disabled={rotateRius.isPending}
          size="sm"
        >
          rotate
        </Button>
      </CardHeader>
    </Card>
  )
}

function SiusSection() {
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )

  return (
    <Card>
      <CardHeader className="flex items-center justify-between pb-2">
        <div className="space-y-2">
          <CardTitle>stack it up</CardTitle>
          <CardDescription>
            {rounds.length} active {pluralize("round", rounds.length)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rounds.map((round) => (
          <div
            key={round.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="text-sm">
              round #{round.id} ({round.sets?.length ?? 0}{" "}
              {pluralize("trick", round.sets?.length ?? 0)})
            </span>
            <Button asChild size="sm" variant="secondary">
              <Link to="/games/sius/$roundId" params={{ roundId: round.id }}>
                view
              </Link>
            </Button>
          </div>
        ))}
        {rounds.length < 3 && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-muted-foreground text-sm font-medium">
              start a new round
            </p>
            <SiusStartRoundForm />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BiusSection() {
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())

  return (
    <Card>
      <CardHeader className="flex items-center justify-between pb-2">
        <div className="space-y-2">
          <CardTitle>back it up</CardTitle>
          <CardDescription>
            {rounds.length} {pluralize("round", rounds.length)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rounds.map((round) => (
          <div
            key={round.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="text-sm">
              round #{round.id} ({round.sets?.length ?? 0}{" "}
              {pluralize("set", round.sets?.length ?? 0)})
            </span>
            <Button asChild size="sm" variant="secondary">
              <Link to="/games/bius/$roundId" params={{ roundId: round.id }}>
                view
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
